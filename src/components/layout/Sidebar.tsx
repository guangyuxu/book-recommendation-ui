import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  LogOut,
  MessageSquarePlus,
  Settings,
  User,
} from "lucide-react";
import { useAuth } from "@/auth/context";
import { useThreads } from "@/api/chat";
import { ChildSwitcher } from "./ChildSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const threads = useThreads();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const displayName = me?.display_name || me?.email || "Account";

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <BookOpen className="h-5 w-5" />
        <span className="font-semibold">BookRec</span>
      </div>

      <ChildSwitcher />

      <div className="px-3">
        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent"
        >
          <Link to="/">
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recents
        </p>
        <nav className="space-y-0.5">
          {threads.isLoading && (
            <p className="px-2 py-2 text-sm text-muted-foreground">Loading…</p>
          )}
          {threads.isError && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              Couldn&apos;t load chats.
            </p>
          )}
          {threads.data?.length === 0 && !threads.isLoading && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              No chats yet.
            </p>
          )}
          {threads.data?.map((t) => (
            <Link
              key={t.thread_id}
              to={`/c/${t.thread_id}`}
              className={cn(
                "block w-full truncate rounded-md px-2 py-2 text-left text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent",
                location.pathname === `/c/${t.thread_id}` &&
                  "bg-sidebar-accent",
              )}
              title={t.title}
            >
              {t.title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border/50 p-3">
        <Link
          to="/settings"
          className="mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-left">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="truncate">
              {me?.email ?? displayName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
