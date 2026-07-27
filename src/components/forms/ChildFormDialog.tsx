import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/Field";
import { GenderSelect } from "@/components/forms/GenderSelect";
import { TagsInput } from "@/components/forms/TagsInput";
import { StepDialog, type Step } from "@/components/forms/StepDialog";
import { useStepSave } from "@/components/forms/stepSave";
import { useCreateChild, useUpdateChild } from "@/api/children";
import { ReadingProfilePanel } from "@/pages/settings/ReadingProfilePanel";
import { ReadingHistoryPanel } from "@/pages/settings/ReadingHistoryPanel";
import { PoliciesPanel } from "@/pages/settings/PoliciesPanel";
import { apiErrorMessage } from "@/lib/format";
import type { Child, Gender } from "@/types/api";

interface ChildFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  child?: Child;
}

export function ChildFormDialog({
  open,
  onOpenChange,
  mode,
  child,
}: ChildFormDialogProps) {
  // The "working" child: seeded from the prop, replaced with the server row after Basic info is
  // saved so the reading-profile / history / policies tabs unlock (they need the child id).
  const [current, setCurrent] = useState<Child | null>(child ?? null);
  const [active, setActive] = useState("basic");

  useEffect(() => {
    if (open) {
      setCurrent(child ?? null);
      setActive("basic");
    }
  }, [open, child]);

  const childId = current?.id ?? null;
  const locked = !childId;
  const lockHint = "Save basic info first";

  const steps: Step[] = [
    {
      value: "basic",
      label: "Basic info",
      hasSave: true,
      content: <ChildBasicStep child={current} onSaved={setCurrent} />,
    },
    {
      value: "reading",
      label: "Reading profile",
      hasSave: true,
      disabled: locked,
      content: childId ? (
        <ReadingProfilePanel childId={childId} embedded />
      ) : (
        <LockedHint text={lockHint} />
      ),
    },
    {
      value: "history",
      label: "Reading history",
      disabled: locked,
      content: childId ? (
        <ReadingHistoryPanel childId={childId} />
      ) : (
        <LockedHint text={lockHint} />
      ),
    },
    {
      value: "policies",
      label: "Policies",
      disabled: locked,
      content: childId ? (
        <PoliciesPanel childId={childId} />
      ) : (
        <LockedHint text={lockHint} />
      ),
    },
  ];

  return (
    <StepDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add child" : "Edit child"}
      description="Profile, reading level, history, and policies used to tailor recommendations."
      steps={steps}
      active={active}
      onActiveChange={setActive}
    />
  );
}

function LockedHint({ text }: { text: string }) {
  return <p className="py-6 text-sm text-muted-foreground">{text}.</p>;
}

function ChildBasicStep({
  child,
  onSaved,
}: {
  child: Child | null;
  onSaved: (c: Child) => void;
}) {
  const createChild = useCreateChild();
  const updateChild = useUpdateChild();
  const [displayName, setDisplayName] = useState(child?.display_name ?? "");
  const [aliases, setAliases] = useState<string[]>(child?.aliases ?? []);
  const [gender, setGender] = useState<Gender | null>(child?.gender ?? null);
  const [birthDate, setBirthDate] = useState(child?.birth_date ?? "");
  const [grade, setGrade] = useState(child?.grade ?? "");
  const [schoolSystem, setSchoolSystem] = useState(child?.school_system ?? "");
  const [country, setCountry] = useState(child?.country_or_curriculum ?? "");
  const [primaryLang, setPrimaryLang] = useState(child?.primary_language ?? "");
  const [readingLang, setReadingLang] = useState(child?.reading_language ?? "");
  const [notes, setNotes] = useState(child?.notes ?? "");

  useStepSave("basic", async () => {
    const body = {
      display_name: displayName || null,
      aliases,
      gender,
      birth_date: birthDate || null,
      grade: grade || null,
      school_system: schoolSystem || null,
      country_or_curriculum: country || null,
      primary_language: primaryLang || null,
      reading_language: readingLang || null,
      notes: notes || null,
    };
    try {
      const saved = child
        ? await updateChild.mutateAsync({ id: child.id, body })
        : await createChild.mutateAsync(body);
      onSaved(saved);
      toast.success(child ? "Child updated" : "Child added");
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="c_name">
          <Input
            id="c_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="Gender" htmlFor="c_gender">
          <GenderSelect id="c_gender" value={gender} onChange={setGender} />
        </Field>
      </div>
      <Field label="Aliases / nicknames" htmlFor="c_aliases">
        <TagsInput
          id="c_aliases"
          value={aliases}
          onChange={setAliases}
          placeholder="Add a nickname and press Enter"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Birth date" htmlFor="c_birth">
          <Input
            id="c_birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>
        <Field label="Grade" htmlFor="c_grade">
          <Input
            id="c_grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="School system" htmlFor="c_school">
          <Input
            id="c_school"
            value={schoolSystem}
            onChange={(e) => setSchoolSystem(e.target.value)}
          />
        </Field>
        <Field label="Country / curriculum" htmlFor="c_country">
          <Input
            id="c_country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primary language" htmlFor="c_plang">
          <Input
            id="c_plang"
            value={primaryLang}
            onChange={(e) => setPrimaryLang(e.target.value)}
          />
        </Field>
        <Field label="Reading language" htmlFor="c_rlang">
          <Input
            id="c_rlang"
            value={readingLang}
            onChange={(e) => setReadingLang(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="c_notes">
        <Textarea
          id="c_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </div>
  );
}
