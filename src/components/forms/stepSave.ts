// The StepDialog <-> step contract: the registration context and the hook steps use to publish
// their save to the dialog's shared footer.
//
// Split out of StepDialog.tsx because that file must export only components (React Fast Refresh /
// react-refresh/only-export-components, enforced by `make ci` at --max-warnings 0). The context
// object has to travel with the hook -- StepDialog imports it to provide, steps consume it through
// useStepSave -- so both live here.

import * as React from "react";

// A step returns true from its save when the write succeeded (advance), false to stay put.
export type SaveFn = () => Promise<boolean>;

export const RegisterContext = React.createContext<
  (value: string, fn: SaveFn | null) => void
>(() => {});

// Form steps call this to expose their save to the shared footer. The latest closure is always
// used (via a ref), and the handler is torn down when the step unmounts.
export function useStepSave(value: string, save: SaveFn): void {
  const register = React.useContext(RegisterContext);
  const saveRef = React.useRef(save);
  saveRef.current = save;
  React.useEffect(() => {
    register(value, () => saveRef.current());
    return () => register(value, null);
  }, [register, value]);
}
