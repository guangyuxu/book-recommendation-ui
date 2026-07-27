# book-recommendation-ui

Frontend for the book-recommendation platform — a ChatGPT-style web app: a left sidebar (new chat,
recents, settings) beside a chat area, plus full family / member / child management under Settings.

It talks to **two** backends **directly, by absolute URL** — no reverse proxy, both CORS-enabled
for this origin, one access token accepted by both:

- **accounts** (`book-recommendation-accounts`) — the identity provider and the single writer of
  the family/member/child/reading-profile/policy tables.
- **service** (`book-recommendation-service`) — the BFF, which proxies chat over SSE and drives the
  HITL confirmation flow. It is the auth boundary: the browser never talks to the agent.

nginx (in the production image) serves the static bundle only.

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives) for styling and accessible components
- **React Router** for routing, **TanStack Query** for server state
- **React Hook Form** + **Zod** for forms and validation
- Auth: the access token lives in memory; the refresh token is an HttpOnly cookie owned by the
  backend. A `401` transparently triggers `/auth/refresh` and one retry.

## Prerequisites

Run the backend (`book-recommendation-accounts`) locally first:

```bash
cd ../book-recommendation-accounts
make keygen      # once: generate the RS256 keypair
make init-db     # once: create the schema (needs Postgres running)
make run         # serves http://localhost:8001
```

> **Local dev note:** the refresh-token cookie is `Secure` by default, so it is **not** sent over
> plain HTTP. For local development set `REFRESH_COOKIE_SECURE=false` in the backend's `.env`, or
> the "stay logged in across reloads" (silent refresh) flow won't work. `localhost:5173` and
> `localhost:8001` are same-site, so `SameSite=Lax` is fine. The backend's default CORS allowlist
> already includes `http://localhost:5173`.

## Getting started

Node is pinned in `.nvmrc` (22, matching the Dockerfile's `node:22-alpine` build stage):

```bash
nvm use                   # or any Node >= 22 (see `engines` in package.json)
make install              # npm ci — exactly what package-lock.json pins
make dev                  # http://localhost:5173
```

Both backend base URLs default to localhost, so no `.env` is needed for local dev. To point at
different origins, create one (`.env` is git-ignored):

```bash
VITE_API_BASE_URL=http://localhost:8001        # accounts service
VITE_CHAT_BASE_URL=http://localhost:8000/chat  # BFF/service
```

> `VITE_*` values are inlined into the bundle at **build** time and are public. Never put a secret
> in one.

## Build & verification

The **Makefile is the single source of truth** for verification: `.github/workflows/ci.yml` and
`.pre-commit-config.yaml` only call these targets, never restate the commands, so local and CI
cannot drift. See the VERIFICATION MAP at the top of the `Makefile`.

| Command                 | What it does                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `make check`            | **Everyday gate** after a change: `lint` + `test` (fast, offline)                                                                        |
| `make ci`               | **What GitHub Actions runs verbatim**: `lint` + `coverage` + `build`                                                                     |
| `make lint`             | `lint_eslint` + `lint_format` + `typecheck`                                                                                              |
| `make lint_eslint`      | `eslint . --max-warnings 0` — a warning is a failure                                                                                     |
| `make lint_format`      | `prettier --check .` — read-only                                                                                                         |
| `make typecheck`        | `tsc -b` over `src/`, the Vite config, **and** `tests/`                                                                                  |
| `make test`             | `vitest run` — the `tests/unit_tests` suite (jsdom)                                                                                      |
| `make coverage`         | the suite under coverage, with per-module floors                                                                                         |
| `make build`            | `tsc -b && vite build` — proves the bundle is deliverable                                                                                |
| `make format`           | auto-fix: `prettier --write`, then `eslint --fix`                                                                                        |
| `make audit`            | `npm audit --audit-level=high` — **needs the network**, so it is kept out of `ci` and runs on a schedule (`.github/workflows/audit.yml`) |
| `make dev` / `make run` | Vite dev server with HMR (port 5173)                                                                                                     |
| `make preview`          | serve the production build locally (after `make build`)                                                                                  |

`make help` lists all of them. `build` is in `ci` but not in `check`: the deliverable here is a
bundle, and this is the only check that proves one can be produced — it stays out of the everyday
loop to keep that loop fast.

Optional local hooks (`make check` on commit, `make ci` on push, plus a gitleaks secret scan).
pre-commit comes from pipx/brew rather than npm — see `.pre-commit-config.yaml`:

```bash
pipx install pre-commit && pre-commit install
```

Tests live in `tests/unit_tests/`, whose tree **mirrors `src/`** — the same layout law the sibling
repos hold. `tests/README.md` is the authoritative text.

## Project structure

```
src/
  api/            TanStack Query hooks, one file per resource
  auth/           AuthProvider (in-memory token + silent refresh) + route guard
  child/          ActiveChildProvider — which child the chat/settings are scoped to
  components/
    forms/        Reusable fields (TagsInput, GenderSelect, BoolSelect) and entity dialogs
                  keyValue.ts / stepSave.ts hold the non-component exports (see below)
    layout/       AppLayout + Sidebar + ChildSwitcher
    ui/           shadcn/ui primitives (buttonVariants.ts holds Button's cva recipe)
  lib/            fetch wrapper (api.ts), SSE chat client (chatApi.ts), query client, formatting
  pages/
    chat/         Chat: streamed turns (SSE) + the HITL confirmation card
    settings/     Family, My profile, Members, Children (+ reading profile & policies)
  types/          TypeScript mirrors of the backend contracts
tests/
  unit_tests/     tree MIRRORS src/ — see tests/README.md for the layout law
```

A few modules exist only to hold a non-component export (`buttonVariants.ts`, `keyValue.ts`,
`stepSave.ts`). That is deliberate: a file exporting both a component and a non-component breaks
React Fast Refresh, and `make ci` runs eslint at `--max-warnings 0`. Each file says so at the top.

## Status

- ✅ Auth (signup / login / silent refresh / logout)
- ✅ Family, members, invites, children, reading profiles, and reading policies management
- ✅ Chat — streamed turns over SSE against the BFF, with the HITL confirmation card and
  recents in the sidebar backed by the real thread list
