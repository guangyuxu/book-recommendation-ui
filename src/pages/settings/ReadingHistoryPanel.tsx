import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateReadingHistoryEntry,
  useDeleteReadingHistoryEntry,
  useReadingHistory,
  useUpdateReadingHistoryEntry,
} from "@/api/readingHistory";
import { QueryState } from "@/components/QueryState";
import { ReadingHistoryFormDialog } from "@/components/forms/ReadingHistoryFormDialog";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, formatDate } from "@/lib/format";
import type { ReadingHistoryEntry } from "@/types/api";

// The child's reading history — a list of books, each editable via a nested dialog. Rows persist
// immediately (this is a list, not a form), so inside the child StepDialog its tab is nav-only.
export function ReadingHistoryPanel({ childId }: { childId: string }) {
  const historyQuery = useReadingHistory(childId);
  const createEntry = useCreateReadingHistoryEntry(childId);
  const updateEntry = useUpdateReadingHistoryEntry(childId);
  const deleteEntry = useDeleteReadingHistoryEntry(childId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ReadingHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState<ReadingHistoryEntry | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteEntry.mutateAsync(deleting.id);
      toast.success("Book removed");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Books this child has read or is reading.
        </p>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add book
        </Button>
      </div>

      <QueryState isLoading={historyQuery.isLoading} error={historyQuery.error}>
        {historyQuery.data && historyQuery.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border">
            {historyQuery.data.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {entry.title || "Untitled"}
                    {entry.liked === true && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        Liked
                      </span>
                    )}
                    {entry.liked === false && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        Disliked
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      entry.author,
                      entry.series_name &&
                        `${entry.series_name}${entry.book_order ? ` #${entry.book_order}` : ""}`,
                      entry.status,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No details"}
                  </p>
                  {(entry.started_at || entry.finished_at) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.started_at)} –{" "}
                      {formatDate(entry.finished_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(entry)}
                    aria-label="Edit book"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleting(entry)}
                    aria-label="Remove book"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No books logged yet.</p>
        )}
      </QueryState>

      <ReadingHistoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={(body) => createEntry.mutateAsync(body)}
      />

      {editing && (
        <ReadingHistoryFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          entry={editing}
          onSubmit={(body) => updateEntry.mutateAsync({ id: editing.id, body })}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove book?"
        description={`This removes "${deleting?.title || "this book"}" from the reading history.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
