import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/forms/Field";
import { TagsInput } from "@/components/forms/TagsInput";
import {
  KeyValueEditor,
  objectToRows,
  rowsToObject,
  type KVRow,
} from "@/components/forms/KeyValueEditor";
import { apiErrorMessage } from "@/lib/format";
import type { Policy, PolicyCreate } from "@/types/api";

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  policy?: Policy;
  onSubmit: (body: PolicyCreate) => Promise<unknown>;
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  mode,
  policy,
  onSubmit,
}: PolicyFormDialogProps) {
  const [goals, setGoals] = useState<string[]>(policy?.goals ?? []);
  const [constraints, setConstraints] = useState<string[]>(
    policy?.constraints ?? [],
  );
  const [avoidTopics, setAvoidTopics] = useState<string[]>(
    policy?.avoid_topics ?? [],
  );
  const [notes, setNotes] = useState(policy?.notes ?? "");
  const [isActive, setIsActive] = useState(policy?.is_active ?? true);
  const [prefs, setPrefs] = useState<KVRow[]>(
    objectToRows(policy?.content_preferences),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        goals,
        constraints,
        avoid_topics: avoidTopics,
        content_preferences: rowsToObject(prefs),
        notes: notes || null,
        is_active: isActive,
      });
      toast.success(mode === "create" ? "Policy created" : "Policy updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New reading policy" : "Edit policy"}
          </DialogTitle>
          <DialogDescription>
            Goals and guardrails that shape recommendations for this child.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Goals" htmlFor="pol_goals">
            <TagsInput
              id="pol_goals"
              value={goals}
              onChange={setGoals}
              placeholder="e.g. build vocabulary"
            />
          </Field>
          <Field label="Constraints" htmlFor="pol_constraints">
            <TagsInput
              id="pol_constraints"
              value={constraints}
              onChange={setConstraints}
              placeholder="e.g. under 200 pages"
            />
          </Field>
          <Field label="Avoid topics" htmlFor="pol_avoid">
            <TagsInput
              id="pol_avoid"
              value={avoidTopics}
              onChange={setAvoidTopics}
              placeholder="e.g. graphic violence"
            />
          </Field>
          <Field
            label="Content preferences"
            hint="Free-form key/value settings. Values may be JSON (e.g. true, 12, a list)."
          >
            <KeyValueEditor rows={prefs} onChange={setPrefs} />
          </Field>
          <Field label="Notes" htmlFor="pol_notes">
            <Textarea
              id="pol_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              id="pol_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <label htmlFor="pol_active" className="text-sm">
              Active
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
