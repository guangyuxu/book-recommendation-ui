import { Outlet } from "react-router-dom";
import { ActiveChildProvider } from "@/child/ActiveChildProvider";
import { Sidebar } from "./Sidebar";

// Two-pane shell: fixed sidebar on the left, routed content on the right. The active-child provider
// wraps both so the sidebar switcher and the chat page share one selection.
export function AppLayout() {
  return (
    <ActiveChildProvider>
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 overflow-hidden border-l border-border">
          <Outlet />
        </main>
      </div>
    </ActiveChildProvider>
  );
}
