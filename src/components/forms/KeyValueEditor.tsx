import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Edits a free-form dict (the backend's `content_preferences: dict[str, Any]`) as key/value rows.
// Values are entered as text; on save each value is JSON-parsed when possible (so `true`, `12`,
// `["a","b"]` become typed), otherwise kept as a plain string.

export interface KVRow {
  key: string;
  value: string;
}

export function objectToRows(obj: Record<string, unknown> | undefined): KVRow[] {
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

interface KeyValueEditorProps {
  rows: KVRow[];
  onChange: (rows: KVRow[]) => void;
}

export function KeyValueEditor({ rows, onChange }: KeyValueEditorProps) {
  function update(index: number, patch: Partial<KVRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...rows, { key: "", value: "" }]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="key"
            className="flex-1"
          />
          <Input
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="value"
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => remove(i)}
            aria-label="Remove entry"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-4 w-4" />
        Add preference
      </Button>
    </div>
  );
}
