// The KeyValueEditor's data mapping, kept apart from the component that renders it.
//
// Two reasons: a file that exports both a component and non-components breaks React Fast Refresh
// (react-refresh/only-export-components, and `make ci` runs eslint with --max-warnings 0), and
// these two functions are the only *lossy* part of the editor -- they are worth testing on their
// own (tests/unit_tests/components/forms/keyValue.test.ts).
//
// The editor edits a free-form dict (the backend's `content_preferences: dict[str, Any]`) as
// key/value rows. Values are typed as text; on save each value is JSON-parsed when possible (so
// `true`, `12`, `["a","b"]` become typed), otherwise kept as a plain string.

export interface KVRow {
  key: string;
  value: string;
}

export function objectToRows(
  obj: Record<string, unknown> | undefined,
): KVRow[] {
  if (!obj) return [];
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

export function rowsToObject(rows: KVRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of rows) {
    const k = key.trim();
    if (!k) continue;
    try {
      out[k] = JSON.parse(value);
    } catch {
      out[k] = value;
    }
  }
  return out;
}
