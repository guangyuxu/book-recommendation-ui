import { useCallback, useMemo, useState } from "react";
import { useChildren } from "@/api/children";
import { ActiveChildContext, type ActiveChildState } from "./context";

// Holds the active-child selection for the authed app. Defaults sensibly and self-heals: when the
// children list loads (or changes), it auto-selects the sole child, keeps a still-valid selection,
// and clears one that points at a deleted child.
export function ActiveChildProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const query = useChildren();
  const list = useMemo(() => query.data ?? [], [query.data]);
  // What the user picked. The *effective* selection is derived below, not stored: normalising it
  // in an effect would re-render twice and briefly expose a selection pointing at a deleted child.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Self-healing happens here, during render: an empty list has no active child, and a selection
  // that no longer resolves falls back to the first (which is also what auto-selects a sole child).
  const activeChild = useMemo(
    () =>
      list.length === 0
        ? null
        : (list.find((c) => c.id === selectedId) ?? list[0]),
    [list, selectedId],
  );
  const activeChildId = activeChild?.id ?? null;

  const set = useCallback((id: string | null) => setSelectedId(id), []);

  const value = useMemo<ActiveChildState>(
    () => ({
      activeChildId,
      setActiveChildId: set,
      activeChild,
      children: list,
      isLoading: query.isLoading,
    }),
    [activeChildId, set, activeChild, list, query.isLoading],
  );

  return (
    <ActiveChildContext.Provider value={value}>
      {children}
    </ActiveChildContext.Provider>
  );
}
