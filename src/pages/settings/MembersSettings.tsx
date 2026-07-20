import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/context";
import { useDeleteMember, useMembers } from "@/api/members";
import { QueryState } from "@/components/QueryState";
import { MemberFormDialog } from "@/components/forms/MemberFormDialog";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/format";
import type { Member } from "@/types/api";

export function MembersSettings() {
  const { me } = useAuth();
  const membersQuery = useMembers();
  const deleteMember = useDeleteMember();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMember.mutateAsync(deleting.id);
      toast.success("Member removed");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Everyone who belongs to this family.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add member
        </Button>
      </div>

      <QueryState isLoading={membersQuery.isLoading} error={membersQuery.error}>
        <ul className="divide-y divide-border rounded-lg border">
          {membersQuery.data?.map((member) => {
            const isSelf = member.id === me?.family_member_id;
            return (
              <li
                key={member.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.display_name || member.email || "Unnamed member"}
                    {isSelf && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        You
                      </span>
                    )}
                    {member.is_primary_user && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(member)}
                    aria-label="Edit member"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isSelf}
                    title={isSelf ? "You can't remove yourself here" : undefined}
                    onClick={() => setDeleting(member)}
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </QueryState>

      <MemberFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      {editing && (
        <MemberFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          member={editing}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove member?"
        description={`This permanently removes ${
          deleting?.display_name || "this member"
        } from the family.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
