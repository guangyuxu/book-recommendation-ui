import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  useEffect(() => {
    if (list.length === 0) {
      if (activeChildId !== null) setActiveChildId(null);
      return;
    }
    const stillValid = list.some((c) => c.id === activeChildId);
    if (!stillValid) {
      // Auto-select when there's exactly one child; otherwise fall back to the first.
      setActiveChildId(list[0].id);
    }
  }, [list, activeChildId]);

  const activeChild = useMemo(
    () => list.find((c) => c.id === activeChildId) ?? null,
    [list, activeChildId],
  );

  const set = useCallback((id: string | null) => setActiveChildId(id), []);

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
