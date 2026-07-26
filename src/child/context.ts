import { createContext, useContext } from "react";
import type { Child } from "@/types/api";

// The child the current/next conversation is about. Per-thread binding: a new chat is created bound
// to `activeChildId`, and opening an existing thread syncs this to that thread's child so the
// sidebar switcher always reflects the open conversation. In-memory only (matches the app's
// no-localStorage convention; see lib/api.ts).
export interface ActiveChildState {
  activeChildId: string | null;
  setActiveChildId: (id: string | null) => void;
  // The resolved child object for activeChildId, or null.
  activeChild: Child | null;
  // The family's children (from useChildren), for the switcher.
  children: Child[];
  isLoading: boolean;
}

export const ActiveChildContext = createContext<ActiveChildState | null>(null);

export function useActiveChild(): ActiveChildState {
  const ctx = useContext(ActiveChildContext);
  if (!ctx) {
    throw new Error("useActiveChild must be used within <ActiveChildProvider>");
  }
  return ctx;
}
