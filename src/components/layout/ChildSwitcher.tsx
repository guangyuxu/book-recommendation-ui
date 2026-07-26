import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useActiveChild } from "@/child/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function childLabel(name: string | null): string {
  return name && name.trim() ? name : "Unnamed child";
}

function initial(name: string | null): string {
  return childLabel(name).charAt(0).toUpperCase();
}

// The active-child switcher pinned at the top of the sidebar. It sets which child the next chat is
// about; under per-thread binding, switching to a different child while viewing a conversation
// starts a fresh chat for that child (an existing thread keeps its original child).
export function ChildSwitcher() {
  const { activeChildId, setActiveChildId, activeChild, children, isLoading } =
    useActiveChild();
  const navigate = useNavigate();
  const location = useLocation();

  function selectChild(id: string) {
    const changed = id !== activeChildId;
    setActiveChildId(id);
    if (changed && location.pathname.startsWith("/c/")) {
      navigate("/");
    }
  }

  // No children yet: send the user to where they can add one.
  if (!isLoading && children.length === 0) {
    return (
      <div className="px-3 pb-2">
        <Link
          to="/settings/children"
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
          Add a child
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-2 text-sm hover:bg-sidebar-accent"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {activeChild ? initial(activeChild.display_name) : "?"}
            </span>
            <span className="flex-1 truncate text-left">
              {activeChild ? childLabel(activeChild.display_name) : "Select a child"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Recommendations for</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {children.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => selectChild(c.id)}
              className="gap-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium">
                {initial(c.display_name)}
              </span>
              <span className="flex-1 truncate">{childLabel(c.display_name)}</span>
              {c.id === activeChildId && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings/children">
              <Plus className="h-4 w-4" />
              Manage children
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
