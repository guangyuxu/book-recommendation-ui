import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tri-state control for the backend's nullable booleans: Unknown (null) / Yes / No.
const UNKNOWN = "__unknown__";

interface BoolSelectProps {
  value: boolean | null | undefined;
  onChange: (next: boolean | null) => void;
  id?: string;
}

export function BoolSelect({ value, onChange, id }: BoolSelectProps) {
  const current = value === true ? "yes" : value === false ? "no" : UNKNOWN;
  return (
    <Select
      value={current}
      onValueChange={(v) =>
        onChange(v === "yes" ? true : v === "no" ? false : null)
      }
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNKNOWN}>Unknown</SelectItem>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
      </SelectContent>
    </Select>
  );
}
