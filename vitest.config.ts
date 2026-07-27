// Vitest config, deliberately SEPARATE from vite.config.ts.
//
// Merging into vite.config.ts would make the production build import vitest (`defineConfig` from
// "vitest/config"), so `vite build` -- and therefore the Docker image -- would depend on the test
// tooling being installed. Keeping it here means the build never sees vitest, while the `@` alias
// and the react plugin still have exactly ONE definition (vite.config.ts, merged in below).
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom for the component tests; the pure-logic tests don't care.
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      // No `globals: true`: tests import { describe, it, expect } from "vitest" explicitly, so
      // eslint needs no extra globals and the test tsconfig needs no ambient types.
      include: ["tests/unit_tests/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        // Cover the app source, not the config/entrypoints.
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/main.tsx", // the mount call; nothing to assert
          "src/vite-env.d.ts",
          "src/types/**", // interfaces only -- no runtime code can ever be covered
          "src/components/ui/**", // vendored shadcn/Radix wrappers; upstream's behavior, not ours
        ],
        // Floors, not goals: each is set just under the current number so a regression fails
        // while day-to-day work doesn't. Raise them as coverage grows -- never lower them.
        //
        // The GLOBAL floor is low on purpose and is NOT the real gate: most of src/ is
        // presentational JSX (pages, dialogs, layout) that no test covers yet, so one repo-wide
        // number can't distinguish "a page is still untested" from "the fetch wrapper broke".
        // The per-glob floors below are the actual gate -- they pin the logic-bearing modules the
        // suite owns, so a regression THERE fails the build regardless of the global average.
        //
        // RE-BASELINED for vitest 4 / @vitest/coverage-v8 4, which turned AST-aware remapping on
        // by default. That changed what the DENOMINATORS mean, not what the suite covers: every
        // function and branch in a never-imported file now counts, where v3 largely did not count
        // them. Measured on the identical suite and sources, master (v3) vs this branch (v4):
        //
        //     statements  7.17% -> 11.94%    branches  70.70% -> 11.35%
        //     lines       7.17% -> 11.53%    functions 30.23% ->  9.38%
        //
        // Statements and lines went UP and their floors rise with them; branches and functions
        // collapsed purely because their denominators grew (861 branches / 372 functions now
        // include the untested pages). Re-pinning them to the v3 numbers would fail every build
        // for a measurement change, so they are re-pinned just under the v4 numbers. This is a
        // re-baseline against a new ruler, not a lowered bar -- the "never lower them" rule still
        // holds for every change measured on THIS ruler.
        thresholds: {
          lines: 11,
          functions: 9,
          statements: 11,
          branches: 11,
          "src/lib/api.ts": {
            // 95 -> 94: remapping shifted this file by ~1.5 points with no test change.
            lines: 94,
            functions: 75,
            statements: 94,
            branches: 95,
          },
          "src/lib/format.ts": {
            lines: 100,
            functions: 100,
            statements: 100,
            branches: 100,
          },
          "src/components/forms/keyValue.ts": {
            lines: 100,
            functions: 100,
            statements: 100,
            branches: 100,
          },
        },
      },
    },
  }),
);
