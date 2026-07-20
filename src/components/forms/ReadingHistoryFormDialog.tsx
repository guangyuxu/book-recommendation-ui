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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/Field";
import { TagsInput } from "@/components/forms/TagsInput";
import { BoolSelect } from "@/components/forms/BoolSelect";
import { apiErrorMessage } from "@/lib/format";
import type { ReadingHistoryCreate, ReadingHistoryEntry } from "@/types/api";

interface ReadingHistoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  entry?: ReadingHistoryEntry;
  onSubmit: (body: ReadingHistoryCreate) => Promise<unknown>;
}

export function ReadingHistoryFormDialog({
  open,
  onOpenChange,
  mode,
  entry,
  onSubmit,
}: ReadingHistoryFormDialogProps) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [author, setAuthor] = useState(entry?.author ?? "");
  const [seriesName, setSeriesName] = useState(entry?.series_name ?? "");
  const [bookOrder, setBookOrder] = useState(entry?.book_order ?? "");
  const [status, setStatus] = useState(entry?.status ?? "");
  const [liked, setLiked] = useState<boolean | null>(entry?.liked ?? null);
  const [reasons, setReasons] = useState<string[]>(entry?.reasons ?? []);
  const [parentNote, setParentNote] = useState(entry?.parent_note ?? "");
  const [childNote, setChildNote] = useState(entry?.child_note ?? "");
  const [startedAt, setStartedAt] = useState(entry?.started_at ?? "");
  const [finishedAt, setFinishedAt] = useState(entry?.finished_at ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title: title || null,
        author: author || null,
        series_name: seriesName || null,
        book_order: bookOrder || null,
        status: status || null,
        liked,
        reasons,
        parent_note: parentNote || null,
        child_note: childNote || null,
        started_at: startedAt || null,
        finished_at: finishedAt || null,
      });
      toast.success(mode === "create" ? "Book added" : "Book updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add a book" : "Edit book"}
          </DialogTitle>
          <DialogDescription>
            A book this child has read or is reading.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" htmlFor="rh_title">
            <Input
              id="rh_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author" htmlFor="rh_author">
              <Input
                id="rh_author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="rh_status">
              <Input
                id="rh_status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="reading, finished…"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Series" htmlFor="rh_series">
              <Input
                id="rh_series"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
              />
            </Field>
            <Field label="Book order" htmlFor="rh_order" hint="e.g. 1, 2b">
              <Input
                id="rh_order"
                value={bookOrder}
                onChange={(e) => setBookOrder(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Started" htmlFor="rh_started">
              <Input
                id="rh_started"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </Field>
            <Field label="Finished" htmlFor="rh_finished">
              <Input
                id="rh_finished"
                type="date"
                value={finishedAt}
                onChange={(e) => setFinishedAt(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Liked" htmlFor="rh_liked">
            <BoolSelect id="rh_liked" value={liked} onChange={setLiked} />
          </Field>
          <Field label="Reasons" htmlFor="rh_reasons">
            <TagsInput
              id="rh_reasons"
              value={reasons}
              onChange={setReasons}
              placeholder="Why they liked / disliked it"
            />
          </Field>
          <Field label="Parent note" htmlFor="rh_parent">
            <Textarea
              id="rh_parent"
              value={parentNote}
              onChange={(e) => setParentNote(e.target.value)}
            />
          </Field>
          <Field label="Child note" htmlFor="rh_child">
            <Textarea
              id="rh_child"
              value={childNote}
              onChange={(e) => setChildNote(e.target.value)}
            />
          </Field>

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
              {mode === "create" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
