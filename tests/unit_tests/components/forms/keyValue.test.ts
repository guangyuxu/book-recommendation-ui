// The only lossy mapping in the settings forms: a free-form `content_preferences` dict is edited
// as text rows and JSON-parsed back on save. Both directions have surprising edges worth pinning,
// because a wrong guess here silently changes the type stored on a reading policy.
import { describe, expect, it } from "vitest";

import { objectToRows, rowsToObject } from "@/components/forms/keyValue";

describe("objectToRows", () => {
  it("shows strings raw and everything else as JSON", () => {
    expect(
      objectToRows({
        theme: "space",
        max_pages: 120,
        illustrated: true,
        genres: ["scifi", "myth"],
        note: null,
      }),
    ).toEqual([
      { key: "theme", value: "space" },
      { key: "max_pages", value: "120" },
      { key: "illustrated", value: "true" },
      { key: "genres", value: '["scifi","myth"]' },
      { key: "note", value: "null" },
    ]);
  });

  it("treats a missing dict as no rows", () => {
    expect(objectToRows(undefined)).toEqual([]);
    expect(objectToRows({})).toEqual([]);
  });
});

describe("rowsToObject", () => {
  it("types values that parse as JSON and keeps the rest as strings", () => {
    expect(
      rowsToObject([
        { key: "max_pages", value: "120" },
        { key: "illustrated", value: "true" },
        { key: "genres", value: '["scifi","myth"]' },
        { key: "theme", value: "space" },
      ]),
    ).toEqual({
      max_pages: 120,
      illustrated: true,
      genres: ["scifi", "myth"],
      theme: "space",
    });
  });

  it("drops rows whose key is blank or whitespace", () => {
    // The editor always leaves a freshly-added empty row around; it must not become a "" key.
    expect(
      rowsToObject([
        { key: "", value: "x" },
        { key: "   ", value: "y" },
        { key: "theme", value: "space" },
      ]),
    ).toEqual({ theme: "space" });
  });

  it("trims the key but not the value", () => {
    expect(rowsToObject([{ key: "  theme  ", value: " space " }])).toEqual({
      theme: " space ",
    });
  });

  it("lets a later row win on a duplicate key", () => {
    expect(
      rowsToObject([
        { key: "theme", value: "space" },
        { key: "theme", value: "pirates" },
      ]),
    ).toEqual({ theme: "pirates" });
  });

  it("keeps an empty value as an empty string", () => {
    // JSON.parse("") throws, so this falls through to the string branch -- the behavior the
    // backend needs (an explicit "clear this preference" rather than a dropped key).
    expect(rowsToObject([{ key: "theme", value: "" }])).toEqual({ theme: "" });
  });

  it("survives the round trip for JSON-representable values", () => {
    const original = {
      theme: "space",
      max_pages: 120,
      illustrated: true,
      genres: ["scifi", "myth"],
    };
    expect(rowsToObject(objectToRows(original))).toEqual(original);
  });

  it("does NOT round-trip a numeric-looking string (documented sharp edge)", () => {
    // "120" as a deliberate string comes back as the number 120: the editor cannot express the
    // difference. Pinned so the loss is a known decision rather than a surprise bug report.
    expect(rowsToObject(objectToRows({ max_pages: "120" }))).toEqual({
      max_pages: 120,
    });
  });
});
