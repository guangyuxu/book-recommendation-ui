// Vitest setup, applied to every test file (vitest.config.ts -> test.setupFiles).
//
// Registers jest-dom's DOM matchers (toBeInTheDocument, toBeDisabled, ...) on vitest's `expect`,
// and tears down React Testing Library's mounted trees between tests so one test's DOM can never
// leak into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
