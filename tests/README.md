# Test layout

The same law the sibling repos hold (`book-recommendation-accounts/tests/__init__.py` and the
matching files in `-agent` / `-service`). Python packages carry it in `__init__.py` docstrings;
this repo has no packages, so it lives here — the wording is deliberately aligned.

```
tests/
  setup.ts            registered for every test file (jest-dom matchers + RTL cleanup)
  unit_tests/         the blocking gate: fast, offline, no network. `make test` / `make coverage`
                      scope HERE, so nothing slow can sneak into `ci`.
```

## `unit_tests/` mirrors `src/`

The directory tree under `tests/unit_tests/` **mirrors `src/`**. A missing mirror directory is a
coverage gap you can see at a glance:

```
src/lib/format.ts                     -> tests/unit_tests/lib/format.test.ts
src/components/forms/keyValue.ts      -> tests/unit_tests/components/forms/keyValue.test.ts
```

File names stay descriptive and are **not** forced 1:1 — one module may have several test files
when its concerns split cleanly.

**Exception:** `src/components/ui/` (the vendored shadcn/Radix primitives) has no mirror. Their
behavior is upstream's, not ours; the coverage config excludes them for the same reason.

## No integration layer (yet)

There is no `tests/integration_tests/`. In the Python repos that directory holds end-to-end
journeys against a real Postgres, organized **by business flow** rather than mirroring the source.
The equivalent here would be browser-level journeys (Playwright) against a running stack, which
this repo does not have — so the directory is absent rather than empty. If it arrives, it follows
the sibling law: named by flow, opt-in via a `make integration` target, kept OUT of `make ci`.

## Conventions

- Import test primitives explicitly (`import { describe, it, expect } from "vitest"`) — vitest
  `globals` is deliberately off, so eslint needs no extra globals and no ambient types are needed.
- Never put real PII in a fixture, not even fake-looking child names paired with birth dates. Use
  obvious placeholders (`"child-1"`, `"2015-01-01"`). See `CLAUDE.md`.
