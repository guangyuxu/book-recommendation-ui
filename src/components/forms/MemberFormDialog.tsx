import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/Field";
import { GenderSelect } from "@/components/forms/GenderSelect";
import { TagsInput } from "@/components/forms/TagsInput";
import { StepDialog, type Step } from "@/components/forms/StepDialog";
import { useStepSave } from "@/components/forms/stepSave";
import {
  useCreateMember,
  useMemberProfile,
  useUpdateMember,
  useUpsertMemberProfile,
} from "@/api/members";
import { apiErrorMessage } from "@/lib/format";
import { useSyncOnChange } from "@/lib/syncOnChange";
import type { Gender, Member } from "@/types/api";

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  member?: Member;
}

export function MemberFormDialog({
  open,
  onOpenChange,
  mode,
  member,
}: MemberFormDialogProps) {
  // The "working" member: seeded from the prop, replaced with the server row after each save so
  // stepping back to Basic info (or reopening) reflects what was actually persisted.
  const [current, setCurrent] = useState<Member | null>(member ?? null);
  const [active, setActive] = useState("basic");

  // Re-seed the wizard when it (re)opens, and when a fresh server row arrives while it is open.
  useSyncOnChange([open, member], () => {
    if (open) {
      setCurrent(member ?? null);
      setActive("basic");
    }
  });

  const memberId = current?.id ?? null;

  const steps: Step[] = [
    {
      value: "basic",
      label: "Basic info",
      hasSave: true,
      content: <MemberBasicStep member={current} onSaved={setCurrent} />,
    },
    {
      value: "profile",
      label: "Profile",
      hasSave: true,
      disabled: !memberId,
      content: memberId ? <MemberProfileStep memberId={memberId} /> : null,
    },
  ];

  return (
    <StepDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add member" : "Edit member"}
      description={
        mode === "create"
          ? "Add a family member record. To grant login access, send them an invite instead."
          : "Update this member's details and profile."
      }
      steps={steps}
      active={active}
      onActiveChange={setActive}
    />
  );
}

function MemberBasicStep({
  member,
  onSaved,
}: {
  member: Member | null;
  onSaved: (m: Member) => void;
}) {
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const [displayName, setDisplayName] = useState(member?.display_name ?? "");
  const [role, setRole] = useState(member?.role ?? "member");
  const [gender, setGender] = useState<Gender | null>(member?.gender ?? null);
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? "");
  const [language, setLanguage] = useState(member?.language_preference ?? "");

  useStepSave("basic", async () => {
    // Members created here are records only — no login credentials. Login access is granted through
    // the invite flow, where the person self-registers and owns their own password.
    const body = {
      display_name: displayName || null,
      role: role || "member",
      gender,
      birth_date: birthDate || null,
      language_preference: language || null,
    };
    try {
      const saved = member
        ? await updateMember.mutateAsync({ id: member.id, body })
        : await createMember.mutateAsync(body);
      onSaved(saved);
      toast.success(member ? "Member updated" : "Member added");
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    }
  });

  return (
    <div className="space-y-4">
      <Field label="Display name" htmlFor="m_name">
        <Input
          id="m_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Role" htmlFor="m_role">
          <Input
            id="m_role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="parent, member…"
          />
        </Field>
        <Field label="Gender" htmlFor="m_gender">
          <GenderSelect id="m_gender" value={gender} onChange={setGender} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Birth date" htmlFor="m_birth">
          <Input
            id="m_birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>
        <Field label="Language" htmlFor="m_lang">
          <Input
            id="m_lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="zh-CN"
          />
        </Field>
      </div>
    </div>
  );
}

function MemberProfileStep({ memberId }: { memberId: string }) {
  // Prefill from the existing 1:1 profile; a 404 (no profile yet) leaves the fields empty.
  const query = useMemberProfile(memberId);
  const upsert = useUpsertMemberProfile();
  const profileExisted = !!query.data;
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [communication, setCommunication] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);

  useSyncOnChange([query.data], () => {
    const p = query.data;
    if (!p) return;
    setOccupation(p.occupation_background ?? "");
    setEducation(p.education_background ?? "");
    setCommunication(p.communication_style ?? "");
    setConcerns(p.concerns ?? []);
  });

  useStepSave("profile", async () => {
    const hasContent =
      !!occupation || !!education || !!communication || concerns.length > 0;
    // Nothing to write and no existing row — let the user close without creating an empty profile.
    if (!hasContent && !profileExisted) return true;
    try {
      await upsert.mutateAsync({
        memberId,
        body: {
          occupation_background: occupation || null,
          education_background: education || null,
          communication_style: communication || null,
          concerns,
        },
      });
      toast.success("Profile saved");
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    }
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Background context used to tailor recommendations for this member.
      </p>
      <Field label="Occupation background" htmlFor="m_occupation">
        <Textarea
          id="m_occupation"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
        />
      </Field>
      <Field label="Education background" htmlFor="m_education">
        <Textarea
          id="m_education"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />
      </Field>
      <Field label="Communication style" htmlFor="m_communication">
        <Textarea
          id="m_communication"
          value={communication}
          onChange={(e) => setCommunication(e.target.value)}
        />
      </Field>
      <Field label="Concerns" htmlFor="m_concerns">
        <TagsInput
          id="m_concerns"
          value={concerns}
          onChange={setConcerns}
          placeholder="Add a concern and press Enter"
        />
      </Field>
    </div>
  );
}
