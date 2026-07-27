import { useState } from "react";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFamily, useUpdateFamily } from "@/api/family";
import { useCreateInvite, useInvites, useRevokeInvite } from "@/api/invites";
import { useMembers } from "@/api/members";
import { QueryState } from "@/components/QueryState";
import { PoliciesPanel } from "./PoliciesPanel";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiErrorMessage, formatDate } from "@/lib/format";
import { useSyncOnChange } from "@/lib/syncOnChange";
import type { InviteResponse } from "@/types/api";

export function FamilySettings() {
  const familyQuery = useFamily();
  const updateFamily = useUpdateFamily();

  const [familyName, setFamilyName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("");

  // Seed the form once the family loads.
  useSyncOnChange([familyQuery.data], () => {
    if (familyQuery.data) {
      setFamilyName(familyQuery.data.family_name ?? "");
      setDefaultLanguage(familyQuery.data.default_language ?? "");
    }
  });

  async function saveFamily() {
    try {
      await updateFamily.mutateAsync({
        family_name: familyName || null,
        default_language: defaultLanguage || null,
      });
      toast.success("Family updated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Family</h2>
          <p className="text-sm text-muted-foreground">
            Basic information about your family.
          </p>
        </div>
        <QueryState isLoading={familyQuery.isLoading} error={familyQuery.error}>
          <div className="space-y-4">
            <Field label="Family name" htmlFor="family_name">
              <Input
                id="family_name"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </Field>
            <Field
              label="Default language"
              htmlFor="default_language"
              hint="e.g. en-US, zh-CN"
            >
              <Input
                id="default_language"
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
              />
            </Field>
            <Button onClick={saveFamily} disabled={updateFamily.isPending}>
              {updateFamily.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </QueryState>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Family-wide policies</h2>
          <p className="text-sm text-muted-foreground">
            Reading goals and guardrails that apply to every child, unless a
            child has their own policy.
          </p>
        </div>
        <PoliciesPanel childId={null} />
      </section>

      <InvitesSection />
    </div>
  );
}

function InvitesSection() {
  const invitesQuery = useInvites();
  const membersQuery = useMembers();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const [lastCreated, setLastCreated] = useState<InviteResponse | null>(null);

  // Resolve created_by_member_id to a display name for a friendlier list.
  function creatorName(memberId: string | null): string {
    if (!memberId) return "—";
    const m = membersQuery.data?.find((x) => x.id === memberId);
    return m?.display_name || m?.email || "Unknown";
  }

  async function handleCreate() {
    try {
      const invite = await createInvite.mutateAsync({});
      setLastCreated(invite);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeInvite.mutateAsync(id);
      toast.success("Invite revoked");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code);
    toast.success("Invite code copied");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invites</h2>
          <p className="text-sm text-muted-foreground">
            Invite another adult to join and manage this family.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleCreate}
          disabled={createInvite.isPending}
        >
          {createInvite.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New invite
        </Button>
      </div>

      {lastCreated && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Invite code created</CardTitle>
            <CardDescription>
              Copy it now — it is shown only once and cannot be retrieved again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
              {lastCreated.code}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyCode(lastCreated.code)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <QueryState isLoading={invitesQuery.isLoading} error={invitesQuery.error}>
        {invitesQuery.data && invitesQuery.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border">
            {invitesQuery.data.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {invite.role}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(invite.created_at)} by{" "}
                    {creatorName(invite.created_by_member_id)} · expires{" "}
                    {formatDate(invite.expires_at)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRevoke(invite.id)}
                  aria-label="Revoke invite"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No active invites.</p>
        )}
      </QueryState>
    </section>
  );
}
