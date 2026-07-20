import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gender } from "@/types/api";

const UNSET = "__unset__";

// Backend gender is "Male" | "Female" | null. We surface a "Not specified" option that maps to null.
interface GenderSelectProps {
  value: Gender | null | undefined;
  onChange: (next: Gender | null) => void;
  id?: string;
}

export function GenderSelect({ value, onChange, id }: GenderSelectProps) {
  return (
    <Select
      value={value ?? UNSET}
      onValueChange={(v) => onChange(v === UNSET ? null : (v as Gender))}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Not specified" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNSET}>Not specified</SelectItem>
        <SelectItem value="Male">Male</SelectItem>
        <SelectItem value="Female">Female</SelectItem>
      </SelectContent>
    </Select>
  );
}
