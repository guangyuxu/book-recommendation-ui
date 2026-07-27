// Display helpers. Backend timestamps are ISO strings; birth_date is a YYYY-MM-DD string.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  // A date-only value must be read as a LOCAL date, not via `new Date(value)`. The spec parses
  // "2015-01-01" as UTC midnight, which toLocaleDateString then renders in local time -- so every
  // birthday showed up one day early for anyone west of UTC. birth_date is a plain calendar date
  // with no timezone, so build it from its parts.
  const parts = DATE_ONLY.exec(value);
  if (parts) {
    const [year, month, day] = parts.slice(1).map(Number);
    const d = new Date(year, month - 1, day);
    // Date rolls impossible dates over (month 13 -> next year), so confirm nothing moved;
    // otherwise fall through to showing the raw backend value.
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d.toLocaleDateString();
    }
    return value;
  }

  // Full ISO timestamps (created_at/updated_at) DO carry a zone; local rendering is correct.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}
