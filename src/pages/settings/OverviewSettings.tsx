import { Link } from "react-router-dom";
import { Baby, Home, Mail, Users } from "lucide-react";
import { useFamily } from "@/api/family";
import { useMembers } from "@/api/members";
import { useChildren } from "@/api/children";
import { usePolicies } from "@/api/policies";
import { useInvites } from "@/api/invites";
import { Card, CardContent } from "@/components/ui/card";

// A one-glance summary of everything under /family, with jump-off links to each management page.
export function OverviewSettings() {
  const family = useFamily();
  const members = useMembers();
  const children = useChildren();
  const policies = usePolicies();
  const invites = useInvites();

  const familyPolicies = policies.data?.filter((p) => p.child_id == null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {family.data?.family_name || "Your family"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Default language: {family.data?.default_language || "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          to="/settings/members"
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={members.data?.length}
        />
        <StatCard
          to="/settings/children"
          icon={<Baby className="h-4 w-4" />}
          label="Children"
          value={children.data?.length}
        />
        <StatCard
          to="/settings/family"
          icon={<Home className="h-4 w-4" />}
          label="Family policies"
          value={familyPolicies.length}
        />
        <StatCard
          to="/settings/children"
          icon={<Home className="h-4 w-4" />}
          label="All policies"
          value={policies.data?.length}
        />
        <StatCard
          to="/settings/family"
          icon={<Mail className="h-4 w-4" />}
          label="Active invites"
          value={invites.data?.length}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Use the sections on the left to manage your{" "}
        <Link to="/settings/family" className="text-foreground underline">
          family
        </Link>
        ,{" "}
        <Link to="/settings/members" className="text-foreground underline">
          members
        </Link>
        , and{" "}
        <Link to="/settings/children" className="text-foreground underline">
          children
        </Link>
        .
      </p>
    </div>
  );
}

function StatCard({
  to,
  icon,
  label,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
}) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
            {icon}
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">
              {value ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
