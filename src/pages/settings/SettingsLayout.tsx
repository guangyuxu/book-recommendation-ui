import { NavLink, Outlet, Link } from "react-router-dom";
import { ArrowLeft, Baby, Home, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/settings", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/settings/family", label: "Family", icon: Home, end: false },
  { to: "/settings/members", label: "Members", icon: Users, end: false },
  { to: "/settings/children", label: "Children", icon: Baby, end: false },
];

export function SettingsLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>
        <h1 className="ml-2 text-lg font-semibold">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 shrink-0 space-y-0.5 border-r border-border p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                  isActive && "bg-accent font-medium",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
