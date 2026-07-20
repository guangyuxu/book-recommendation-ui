import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePolicy,
  useDeletePolicy,
  usePolicies,
  useUpdatePolicy,
} from "@/api/policies";
import { QueryState } from "@/components/QueryState";
import { PolicyFormDialog } from "@/components/forms/PolicyFormDialog";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/format";
import type { Policy } from "@/types/api";

// Reading policies for one scope. The list endpoint returns the whole family's policies; we filter
// by `childId` — a child's id for per-child policies, or `null` for family-wide policies
// (child_id is null). New policies are created bound to the same scope.
export function PoliciesPanel({ childId }: { childId: string | null }) {
  const policiesQuery = usePolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState<Policy | null>(null);

  const isFamilyScope = childId === null;
  const scopedPolicies = policiesQuery.data?.filter((p) =>
    isFamilyScope ? p.child_id == null : p.child_id === childId,
  );

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deletePolicy.mutateAsync(deleting.id);
      toast.success("Policy deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isFamilyScope
            ? "Goals and guardrails that apply to the whole family."
            : "Goals and guardrails for this child."}
        </p>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New policy
        </Button>
      </div>

      <QueryState
        isLoading={policiesQuery.isLoading}
        error={policiesQuery.error}
      >
        {scopedPolicies && scopedPolicies.length > 0 ? (
          <ul className="space-y-3">
            {scopedPolicies.map((policy) => (
              <li key={policy.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span
                    className={
                      policy.is_active
                        ? "rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {policy.is_active ? "Active" : "Inactive"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(policy)}
                      aria-label="Edit policy"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(policy)}
                      aria-label="Delete policy"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <PolicyLine label="Goals" items={policy.goals} />
                <PolicyLine label="Constraints" items={policy.constraints} />
                <PolicyLine label="Avoid" items={policy.avoid_topics} />
                {policy.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {policy.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isFamilyScope
              ? "No family-wide policies yet."
              : "No policies for this child yet."}
          </p>
        )}
      </QueryState>

      <PolicyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={(body) =>
          createPolicy.mutateAsync({ ...body, child_id: childId })
        }
      />

      {editing && (
        <PolicyFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          policy={editing}
          onSubmit={(body) =>
            updatePolicy.mutateAsync({ id: editing.id, body })
          }
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete policy?"
        description="This permanently removes the reading policy."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function PolicyLine({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="text-sm">
      <span className="font-medium">{label}:</span>{" "}
      <span className="text-muted-foreground">{items.join(", ")}</span>
    </p>
  );
}
