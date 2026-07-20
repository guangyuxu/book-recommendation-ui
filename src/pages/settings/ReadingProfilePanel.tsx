import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useReadingProfile,
  useUpsertReadingProfile,
} from "@/api/readingProfile";
import { ApiError } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import { Field } from "@/components/forms/Field";
import { TagsInput } from "@/components/forms/TagsInput";
import { BoolSelect } from "@/components/forms/BoolSelect";
import { useStepSave } from "@/components/forms/StepDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReadingProfileUpsert } from "@/types/api";

const LIST_FIELDS: { key: keyof ReadingProfileUpsert; label: string }[] = [
  { key: "interests", label: "Interests" },
  { key: "preferred_genres", label: "Preferred genres" },
  { key: "disliked_genres", label: "Disliked genres" },
  { key: "liked_themes", label: "Liked themes" },
  { key: "disliked_themes", label: "Disliked themes" },
  { key: "preferred_tone", label: "Preferred tone" },
  { key: "avoid_topics", label: "Avoid topics" },
];

const BOOL_FIELDS: { key: keyof ReadingProfileUpsert; label: string }[] = [
  { key: "independent_reading", label: "Reads independently" },
  { key: "needs_dictionary", label: "Needs a dictionary" },
  { key: "can_read_chapter_books", label: "Can read chapter books" },
  { key: "can_handle_old_language", label: "Can handle archaic language" },
];

type FormState = {
  reading_level_note: string;
  cefr_level: string;
  lexile: string;
  current_stage: string;
  summary: string;
  bools: Record<string, boolean | null>;
  lists: Record<string, string[]>;
};

const EMPTY: FormState = {
  reading_level_note: "",
  cefr_level: "",
  lexile: "",
  current_stage: "",
  summary: "",
  bools: {},
  lists: {},
};

// `embedded` renders the form without its own submit button and registers its save with a
// surrounding StepDialog (via useStepSave), so the dialog's "Save & next" drives it. Standalone
// (no StepDialog ancestor) the registration is a harmless no-op and the button is shown.
export function ReadingProfilePanel({
  childId,
  embedded = false,
}: {
  childId: string;
  embedded?: boolean;
}) {
  const query = useReadingProfile(childId);
  const upsert = useUpsertReadingProfile(childId);
  const [form, setForm] = useState<FormState>(EMPTY);

  // A 404 means "no profile yet" — start from an empty form rather than surfacing an error.
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  const otherError = query.error && !notFound ? query.error : null;

  useEffect(() => {
    const p = query.data;
    if (!p) {
      setForm(EMPTY);
      return;
    }
    setForm({
      reading_level_note: p.reading_level_note ?? "",
      cefr_level: p.cefr_level ?? "",
      lexile: p.lexile != null ? String(p.lexile) : "",
      current_stage: p.current_stage ?? "",
      summary: p.summary ?? "",
      bools: {
        independent_reading: p.independent_reading,
        needs_dictionary: p.needs_dictionary,
        can_read_chapter_books: p.can_read_chapter_books,
        can_handle_old_language: p.can_handle_old_language,
      },
      lists: {
        interests: p.interests ?? [],
        preferred_genres: p.preferred_genres ?? [],
        disliked_genres: p.disliked_genres ?? [],
        liked_themes: p.liked_themes ?? [],
        disliked_themes: p.disliked_themes ?? [],
        preferred_tone: p.preferred_tone ?? [],
        avoid_topics: p.avoid_topics ?? [],
      },
    });
  }, [query.data]);

  async function save(): Promise<boolean> {
    const body: ReadingProfileUpsert = {
      reading_level_note: form.reading_level_note || null,
      cefr_level: form.cefr_level || null,
      lexile: form.lexile ? Number(form.lexile) : null,
      current_stage: form.current_stage || null,
      summary: form.summary || null,
      ...Object.fromEntries(
        BOOL_FIELDS.map((f) => [f.key, form.bools[f.key] ?? null]),
      ),
      ...Object.fromEntries(
        LIST_FIELDS.map((f) => [f.key, form.lists[f.key] ?? []]),
      ),
    };
    try {
      await upsert.mutateAsync(body);
      toast.success("Reading profile saved");
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    }
  }

  // Registers with a surrounding StepDialog; a no-op when rendered standalone.
  useStepSave("reading", save);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await save();
  }

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (otherError) {
    return (
      <p className="py-6 text-sm text-destructive">
        {apiErrorMessage(otherError)}
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="CEFR level" htmlFor="rp_cefr">
          <Input
            id="rp_cefr"
            value={form.cefr_level}
            onChange={(e) => setForm({ ...form, cefr_level: e.target.value })}
            placeholder="A1, B2…"
          />
        </Field>
        <Field label="Lexile" htmlFor="rp_lexile">
          <Input
            id="rp_lexile"
            type="number"
            value={form.lexile}
            onChange={(e) => setForm({ ...form, lexile: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current stage" htmlFor="rp_stage">
          <Input
            id="rp_stage"
            value={form.current_stage}
            onChange={(e) =>
              setForm({ ...form, current_stage: e.target.value })
            }
          />
        </Field>
        <Field label="Reading level note" htmlFor="rp_note">
          <Input
            id="rp_note"
            value={form.reading_level_note}
            onChange={(e) =>
              setForm({ ...form, reading_level_note: e.target.value })
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {BOOL_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`rp_${f.key}`}>
            <BoolSelect
              id={`rp_${f.key}`}
              value={form.bools[f.key]}
              onChange={(v) =>
                setForm({ ...form, bools: { ...form.bools, [f.key]: v } })
              }
            />
          </Field>
        ))}
      </div>

      <div className="space-y-4">
        {LIST_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`rp_${f.key}`}>
            <TagsInput
              id={`rp_${f.key}`}
              value={form.lists[f.key] ?? []}
              onChange={(next) =>
                setForm({ ...form, lists: { ...form.lists, [f.key]: next } })
              }
              placeholder="Add and press Enter"
            />
          </Field>
        ))}
      </div>

      <Field label="Summary" htmlFor="rp_summary">
        <Textarea
          id="rp_summary"
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </Field>

      {!embedded && (
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save reading profile
        </Button>
      )}
    </form>
  );
}
