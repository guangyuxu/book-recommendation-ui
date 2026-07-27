# ─────────────────────────────────────────────────────────────────────────────────────
# VERIFICATION MAP — this Makefile is the single source of truth. ci.yml and
# .pre-commit-config.yaml only CALL these targets (never restate commands), so no drift.
#
#   ci    = lint + coverage + build    ← GitHub Actions (verbatim) + pre-push hook
#   check = lint + test                ← everyday local + pre-commit hook
#   lint  = lint_eslint + lint_format + typecheck
#
#           lint_eslint .. eslint --max-warnings 0   test ......... vitest run
#           lint_format .. prettier --check          coverage ..... vitest run --coverage
#           typecheck .... tsc -b                    build ........ tsc -b && vite build
#
#   coverage RUNS the full test suite (so `ci` does not skip tests); `check` is fully offline.
#   build is in `ci` but NOT in `check` — this is the one shape that differs from the Python
#     siblings. There, `ci` proves the code is correct; here the deliverable is a bundle, and
#     `tsc -b && vite build` is the ONLY check that proves one can actually be produced (a Rollup
#     resolution error or a bad dynamic import passes every other gate and still ships nothing).
#     It stays out of `check` to keep the everyday loop fast.
#   audit (npm audit) is NOT in ci/check — it needs the network, so it runs on a schedule
#     (.github/workflows/audit.yml); run it by hand with `make audit`.
#   fixers (manual):  format = prettier --write + eslint --fix
#
# Every tool runs through `npx --no-install`: it resolves ONLY from node_modules/.bin, so a
# missing devDependency fails loudly instead of npx silently fetching a different version from the
# registry. That is what keeps `check` honest and offline.
# Node version is pinned in .nvmrc (22) to match the Dockerfile's node:22-alpine build stage.
# ─────────────────────────────────────────────────────────────────────────────────────

.PHONY: all \
	lint_eslint lint_format typecheck audit test coverage build \
	lint check ci format \
	install dev run preview help

# Default target executed when no arguments are given to make.
all: help

NPX = npx --no-install

######################
# CHECKS
######################
# Single source of truth for verification. Nothing else restates these commands:
#   - GitHub Actions (.github/workflows/ci.yml) runs `make ci` verbatim.
#   - pre-commit (.pre-commit-config.yaml) runs `make check` on commit and `make ci` on push.
# So local == CI by construction. Audit is excluded (needs the network -- see below).
#
# Everyday use:  `make check`  (fast, offline: lint + test; lint = eslint + prettier + tsc)
# Before push:   `make ci`     (what GitHub Actions runs verbatim: lint + coverage + build)
#
# TEST LAYOUT (the same law in accounts / agent / service -- see tests/README.md):
#   tests/unit_tests/         fast + offline (jsdom), tree MIRRORS src/ -- the blocking gate
#                             (`test`/`coverage` scope HERE, so nothing slow can sneak into `ci`).
#   There is deliberately NO tests/integration_tests/ here: the sibling repos' journeys need a real
#   Postgres, and the frontend equivalent would be browser-level (Playwright) against a running
#   stack. Absent rather than empty -- see tests/README.md.

# -- atomic checks: each is the ONE definition of that check --
lint_eslint:             ## eslint (flat config: typescript-eslint + react-hooks + react-refresh)
	$(NPX) eslint . --max-warnings 0

lint_format:             ## fail if any file is unformatted (does NOT modify files; run `make format` to fix)
	$(NPX) prettier --check .

typecheck:               ## tsc -b over all three projects: src/, vite config, and tests/
	$(NPX) tsc -b

audit:                   ## dependency vulnerability scan (hits the network)
	npm audit --audit-level=high

test:                    ## fast unit suite (jsdom; the offline gate)
	$(NPX) vitest run

coverage:                ## runs the unit suite under coverage + thresholds (this is how `make ci` runs tests)
	$(NPX) vitest run --coverage

build:                   ## type-check and produce the production bundle (proves the artifact is deliverable)
	npm run build

# -- composites --
lint: lint_eslint lint_format typecheck  ## all static checks: eslint + prettier --check + tsc (fast, offline)
check: lint test                         ## everyday gate after code changes: lint + tests (offline)
ci: lint coverage build                  ## gate CI runs verbatim: lint + tests(coverage) + production build
# `audit` is intentionally NOT in `ci`: it needs the network, so it runs on a schedule
# (.github/workflows/audit.yml), not on the per-push/PR blocking path. Run it locally with `make audit`.

######################
# AUTO-FIXERS  (the read-only checks live in the CHECKS section above)
######################

format:                  ## auto-fix formatting, then eslint's fixable rules (the fixer for lint_format)
	$(NPX) prettier --write .
	$(NPX) eslint . --fix

######################
# INSTALL / RUN
######################

install:              ## install exactly what package-lock.json pins (what CI and Docker run)
	npm ci

dev:                  ## Run the Vite dev server (http://localhost:5173)
	npm run dev

# Alias so `make run` means the same thing here as in the Python siblings.
run: dev              ## alias for `dev`

preview:              ## serve the production build locally (requires `make build` first)
	npm run preview

######################
# HELP
######################

help:
	@echo '--- checks (local == CI; see .github/workflows/ci.yml) ---'
	@echo 'check                        - everyday gate after code changes: lint + test (offline)'
	@echo 'ci                           - faithful GitHub CI mirror: lint + coverage + build (offline)'
	@echo 'lint                         - static checks: eslint + prettier --check + tsc -b'
	@echo 'format                       - auto-fix formatting (prettier --write) + eslint --fix'
	@echo 'test                         - run the fast unit suite (tests/unit_tests, jsdom)'
	@echo 'coverage                     - run tests with a coverage report + thresholds'
	@echo 'typecheck                    - tsc -b over src/, the vite config, and tests/'
	@echo 'build                        - produce the production bundle (tsc -b && vite build)'
	@echo 'audit                        - dependency vulnerability scan (npm audit; needs network)'
	@echo 'install                      - npm ci (exactly what package-lock.json pins)'
	@echo 'dev / run                    - run the Vite dev server with HMR (port 5173)'
	@echo 'preview                      - serve the production build locally (after `make build`)'
