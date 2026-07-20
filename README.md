# book-recommendation-ui

Frontend for the book-recommendation platform — a ChatGPT-style web app: a left sidebar (new chat,
recents, settings) beside a chat area, plus full family / member / child management under Settings.

It talks to the **accounts service** (`book-recommendation-accounts`), which is the identity
provider and the single writer of the family/member/child/reading-profile/policy tables.

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

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL defaults to http://localhost:8001
npm run dev               # http://localhost:5173
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Type-check (`tsc -b`) and produce a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  api/            TanStack Query hooks, one file per resource
  auth/           AuthProvider (in-memory token + silent refresh) + route guard
  components/
    forms/        Reusable fields (TagsInput, GenderSelect, BoolSelect) and entity dialogs
    layout/       AppLayout + Sidebar
    ui/           shadcn/ui primitives
  lib/            fetch wrapper (api.ts), query client, formatting helpers
  pages/
    chat/         Chat placeholder (composer disabled until the backend is ready)
    settings/     Family, My profile, Members, Children (+ reading profile & policies)
  types/          TypeScript mirrors of the backend contracts
```

## Status

- ✅ Auth (signup / login / silent refresh / logout)
- ✅ Family, members, invites, children, reading profiles, and reading policies management
- 🚧 Chat is a placeholder — the composer is laid out but disabled until the recommendation
  backend exists. Recents in the sidebar are placeholder items.
