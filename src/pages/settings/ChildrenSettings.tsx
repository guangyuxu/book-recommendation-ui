import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useChildren, useDeleteChild } from "@/api/children";
import { QueryState } from "@/components/QueryState";
import { ChildFormDialog } from "@/components/forms/ChildFormDialog";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, formatDate } from "@/lib/format";
import type { Child } from "@/types/api";

export function ChildrenSettings() {
  const childrenQuery = useChildren();
  const deleteChild = useDeleteChild();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [deleting, setDeleting] = useState<Child | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteChild.mutateAsync(deleting.id);
      toast.success("Child removed");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Children</h2>
          <p className="text-sm text-muted-foreground">
            Profiles, reading levels, history, and policies for each child.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add child
        </Button>
      </div>

      <QueryState
        isLoading={childrenQuery.isLoading}
        error={childrenQuery.error}
      >
        {childrenQuery.data && childrenQuery.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border">
            {childrenQuery.data.map((child) => (
              <li
                key={child.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {child.display_name || "Unnamed child"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Born {formatDate(child.birth_date)}
                    {child.grade ? ` · Grade ${child.grade}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(child)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleting(child)}
                    aria-label="Remove child"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No children yet. Add one to get started.
          </p>
        )}
      </QueryState>

      <ChildFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      {editing && (
        <ChildFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          child={editing}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove child?"
        description={`This permanently removes ${
          deleting?.display_name || "this child"
        } and their reading profile.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
