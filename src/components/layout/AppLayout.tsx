import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

// Two-pane shell: fixed sidebar on the left, routed content on the right.
export function AppLayout() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-hidden border-l border-border">
        <Outlet />
      </main>
    </div>
  );
}
