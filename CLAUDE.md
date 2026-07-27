# Project Rules for Claude Code

This is the **web frontend (SPA)** for the book-recommendation platform: a React + Vite +
TypeScript app styled with Tailwind and shadcn/ui, served in production by nginx from a
multi-stage image. It talks to **two** backends **directly, by absolute URL** — the **accounts
service** (`book-recommendation-accounts`, the IdP and the single writer of the
family/member/child/reading-profile/policy tables) and the **BFF/service**
(`book-recommendation-service`, which proxies chat over SSE and drives the HITL confirmation flow).
Both are CORS-enabled for this origin; **nginx does no reverse-proxying** and the browser
**never** talks to the agent. One access token, issued by accounts and verified by both, works on
both faces. The rules below mirror the sibling repos so all projects hold one standard.

## PII & Security

This project displays and edits children's personal data (name, birthday, gender, reading level).
Treat all child/family data as high-sensitivity PII. On a frontend the risk is not a log file on a
server you control — it is the half-dozen places a browser quietly persists or forwards data.

### Where PII must never go

- **Never in a URL.** Not in a path segment, not in a query string, not in a hash. URLs land in
  browser history, in the `Referer` header sent to any third party, and in server access logs.
  Route by **opaque id** (`/settings/children/:childId`), never by name or birth date. Never
  `?child_name=...`.
- **Never in `localStorage` / `sessionStorage` / non-HttpOnly cookies / IndexedDB.** Web storage
  survives the tab, is readable by any script that achieves XSS, and nothing ever clears it. The
  in-memory TanStack Query cache is the only place server data lives; it dies with the tab.
- **Never in `console.*`.** Browser consoles get screenshotted into bug reports and scraped by
  session-recording tools. When logging a failure, log the shape, not the value:
  ```ts
  // WRONG
  console.error("failed to save child", child, err);
  // RIGHT
  console.error("failed to save child", {
    childId,
    status: (err as ApiError).status,
  });
  ```
- **Never in analytics, error reporting, or any third-party script.** If a tool like Sentry is ever
  added, PII scrubbing must be configured **before** it is enabled, and form values must be masked.
  A stack trace that carries a child's name in a local variable is a leak.
- Safe to log / put in a URL: ids (UUIDs), resource kinds, HTTP statuses, `request_id` from the
  backend's error envelope, boolean flags, counts.

### Token handling rules

- **The access token lives in memory only** (`src/lib/api.ts` closure state) and is injected as a
  `Bearer` header. It is never written to web storage — persisting it would survive an XSS and
  outlive the tab. `tests/unit_tests/lib/api.test.ts` pins this as an executable rule.
- **The refresh token is an HttpOnly cookie owned by the backend**, scoped to `/auth`. This app
  cannot read it and must not try. Requests use `credentials: "include"` so it rides along.
- A `401` on a protected call transparently triggers **one** `/auth/refresh` and **one** retry; a
  second failure drops to the logged-out state. Concurrent 401s collapse into a single refresh
  (`refreshAccessToken`) — do not add a second refresh path. `src/lib/chatApi.ts` deliberately
  reuses that same coordination point rather than owning its own.
- **Never decode the token to make UI decisions beyond display.** The client cannot verify a
  signature, so any client-side claim check is a hint, not a guarantee.

### Authorization rules (what the frontend may and may not assume)

- **The frontend is not an authorization boundary.** Hiding a button is UX, not a permission
  check. Every write must be safe to attempt because the server enforces family scoping — never
  ship a feature whose safety depends on the UI not offering it.
- **Identity is derived server-side.** Never send `family_id` / `family_member_id` as a
  client-chosen value to shape a response; the backend reads them from the verified token. The
  `child_id` this app sends is confirmed against the caller's family server-side.
- Treat everything from the two backends and from the agent's SSE stream as **untrusted text**.
  Render it as text — never `dangerouslySetInnerHTML`, never build a DOM node from an agent
  message.

## Testing rules

- Layout law: `tests/unit_tests/` **mirrors `src/`**. The authoritative text (including the
  documented exceptions) is `tests/README.md` — read it before adding a directory.
- **Never put realistic PII in a fixture**, not even invented child names paired with birth dates.
  Use obvious placeholders (`"child-1"`, `"2015-01-01"`).
- Coverage floors are per-module, not just global (`vitest.config.ts`). The global number is low on
  purpose because most of `src/` is still-untested presentational JSX; the per-glob floors on
  `src/lib/` and the form data mappings are the real gate. **Raise them as coverage grows, never
  lower them.**
- A behavior worth a comment explaining "why" is worth a test pinning it. Date/timezone handling in
  particular: a calendar date (`birth_date`) is not an instant, and `new Date("2015-01-01")` is UTC
  midnight — which rendered every birthday a day early west of UTC until it was fixed and pinned.

## Build & verification

The Makefile `CHECKS` section is the single source of truth for verification. Nothing restates
those commands: GitHub Actions (`.github/workflows/ci.yml`) runs `make ci` verbatim, and the
pre-commit hooks (`.pre-commit-config.yaml`) run `make check` on commit and `make ci` on push. So
local and CI cannot drift.

After every code change, run the everyday gate and make sure it is green before treating the work
as done. Do NOT report a task as complete while any check fails.

```bash
make check   # lint (eslint + prettier --check + tsc -b) + test — fast, offline
```

Before pushing, run the full CI mirror (lint + tests under coverage + the production build):

```bash
make ci      # what GitHub Actions runs verbatim: lint + coverage + build (offline)
```

`build` is in `ci` but not in `check` — this is the one shape that differs from the Python
siblings. The deliverable here is a bundle, and `tsc -b && vite build` is the only check that
proves one can be produced; it stays out of `check` to keep the everyday loop fast.

If `make check` reports formatting diffs, run `make format` to auto-fix them. Install the local
hooks once with `pre-commit install` (pre-commit itself comes from `pipx`/`brew`, not npm — see the
note in `.pre-commit-config.yaml`). Focused subsets while iterating: `make lint`, `make test`,
`make typecheck`.

**eslint runs at `--max-warnings 0`**: a warning is a failure here. Do not silence
`react-refresh/only-export-components` with a disable comment — split the non-component export into
its own module instead (see `src/components/ui/buttonVariants.ts`, `src/components/forms/keyValue.ts`,
`src/components/forms/stepSave.ts`).

Node is pinned in `.nvmrc` (22) and matched by the Dockerfile's `node:22-alpine` build stage and by
`engines` in `package.json`. `package.json` scripts deliberately hold only the Vite-native commands
(`dev` / `build` / `preview`) — checks live in the Makefile, so there is exactly one definition of
each.

Security tooling (does not block the code gate): `make audit` (npm audit, `--audit-level=high`)
runs on a schedule (`.github/workflows/audit.yml`); gitleaks scans for secrets in pre-commit and in
CI; Dependabot opens dependency-update PRs.

`.env` is never committed (`VITE_API_BASE_URL` / `VITE_CHAT_BASE_URL` only). Remember that
**everything in a `VITE_*` variable is compiled into the bundle and is public** — never put a
secret, API key, or token in one.
