import { describe, expect, it } from "vitest";

import { apiErrorMessage, formatDate } from "@/lib/format";

describe("formatDate", () => {
  it("renders an em dash for missing values", () => {
    // The table cells call this with whatever the backend sent; null/"" must not become
    // "Invalid Date".
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("passes an unparseable string through untouched", () => {
    // Better to show the raw backend value than to hide it behind "Invalid Date".
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("formats a YYYY-MM-DD birth date", () => {
    // Output is locale-dependent (some locales render ISO, so it may equal the input), so assert
    // only that the value parsed rather than pinning a literal format.
    const out = formatDate("2015-01-01");
    expect(out).not.toBe("—");
    expect(out).toContain("2015");
  });

  it("reads a date-only value as a LOCAL date, not UTC midnight", () => {
    // Regression: `new Date("2015-01-01")` is UTC midnight, so toLocaleDateString rendered
    // 2014-12-31 for every user west of UTC -- a child's birthday off by one day. A calendar date
    // carries no zone, so it must render as the date the family typed, in every timezone.
    expect(formatDate("2015-01-01")).toBe(
      new Date(2015, 0, 1).toLocaleDateString(),
    );
    expect(formatDate("2015-12-31")).toBe(
      new Date(2015, 11, 31).toLocaleDateString(),
    );
  });

  it("shows an impossible calendar date raw instead of rolling it over", () => {
    // Date(2015, 12, 45) would silently become 2016-02-14; showing the raw value is honest.
    expect(formatDate("2015-13-45")).toBe("2015-13-45");
    expect(formatDate("2015-02-30")).toBe("2015-02-30");
  });

  it("still renders a full ISO timestamp (created_at/updated_at)", () => {
    // These DO carry a zone, so local rendering is correct for them.
    const out = formatDate("2024-03-05T14:30:00Z");
    expect(out).not.toBe("—");
    expect(out).not.toBe("2024-03-05T14:30:00Z");
  });
});

describe("apiErrorMessage", () => {
  it("prefers the error's own message", () => {
    expect(apiErrorMessage(new Error("child not found"))).toBe(
      "child not found",
    );
  });

  it("falls back when there is no usable message", () => {
    // Every shape a rejected query can hand a component.
    expect(apiErrorMessage(undefined)).toBe("Something went wrong");
    expect(apiErrorMessage(null)).toBe("Something went wrong");
    expect(apiErrorMessage("a bare string")).toBe("Something went wrong");
    expect(apiErrorMessage({})).toBe("Something went wrong");
    expect(apiErrorMessage({ message: "" })).toBe("Something went wrong");
    expect(apiErrorMessage({ message: 42 })).toBe("Something went wrong");
  });

  it("honors a caller-supplied fallback", () => {
    expect(apiErrorMessage({}, "Could not save")).toBe("Could not save");
  });
});
