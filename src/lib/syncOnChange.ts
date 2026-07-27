import { useState } from "react";

/**
 * Run `apply` during render whenever any entry in `deps` changes identity.
 *
 * This is React's "adjusting state when a prop changes" pattern, and it is why the forms in this
 * app seed themselves from server data here rather than in a `useEffect`. An effect runs *after*
 * the browser paints, so the user gets one frame of empty (or stale) fields before the seeded
 * values appear, and every seed costs a second render pass. Setting state during render makes
 * React throw the in-progress render away and re-run it before committing, so the seeded values
 * are already in the first painted frame.
 *
 * It is also what `react-hooks/set-state-in-effect` — a React Compiler rule that
 * eslint-plugin-react-hooks turns on from v7 — pushes code towards.
 *
 * `deps` is compared element-wise with `Object.is`, like a `useEffect` dependency array, so it is
 * safe to pass values that are recreated every render as long as their *entries* are stable.
 * Never pass a freshly built object/array as a single dep: its identity changes on every render
 * and `apply` would fire in an infinite loop.
 *
 * `apply` runs during render, so it must only call `setState` on the calling component — no
 * fetches, no subscriptions, no logging. Reach for an effect for any of those.
 */
export function useSyncOnChange(
  deps: readonly unknown[],
  apply: () => void,
): void {
  const [prev, setPrev] = useState(deps);
  const changed =
    prev.length !== deps.length ||
    prev.some((value, i) => !Object.is(value, deps[i]));
  if (changed) {
    setPrev(deps);
    apply();
  }
}
