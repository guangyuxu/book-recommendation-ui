import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// A step returns true from its save when the write succeeded (advance), false to stay put.
type SaveFn = () => Promise<boolean>;

export interface Step {
  value: string;
  label: string;
  // Gated until true — e.g. sub-sections that need the entity created first (in create mode).
  disabled?: boolean;
  // Form steps register a save via useStepSave and get "Save & next"/"Save & close". List steps
  // (which persist per-row on their own) omit this and get plain "Next"/"Done" navigation.
  hasSave?: boolean;
  content: React.ReactNode;
}

const RegisterContext = React.createContext<
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

interface StepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: Step[];
  active: string;
  onActiveChange: (value: string) => void;
}

export function StepDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  active,
  onActiveChange,
}: StepDialogProps) {
  const handlers = React.useRef<Record<string, SaveFn>>({});
  const register = React.useCallback((value: string, fn: SaveFn | null) => {
    if (fn) handlers.current[value] = fn;
    else delete handlers.current[value];
  }, []);

  const [busy, setBusy] = React.useState(false);

  const idx = steps.findIndex((s) => s.value === active);
  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  // Advance by position, not by filtering out disabled steps: a form step's save is what unlocks
  // the following steps (in create mode), and that unlock only lands on the next render — so a
  // disabled-aware lookup here would wrongly resolve to "no next step" right after the save.
  const prevStep = idx > 0 ? steps[idx - 1] : undefined;
  const nextStep = idx < steps.length - 1 ? steps[idx + 1] : undefined;

  const primaryLabel = step?.hasSave
    ? isLast
      ? "Save & close"
      : "Save & next"
    : isLast
      ? "Done"
      : "Next";

  async function handlePrimary() {
    const save = step?.hasSave ? handlers.current[step.value] : undefined;
    if (save) {
      setBusy(true);
      let ok = false;
      try {
        ok = await save();
      } finally {
        setBusy(false);
      }
      if (!ok) return;
    }
    if (nextStep) onActiveChange(nextStep.value);
    else onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <RegisterContext.Provider value={register}>
          <Tabs value={active} onValueChange={onActiveChange}>
            <TabsList className="flex h-auto flex-wrap justify-start">
              {steps.map((s) => (
                <TabsTrigger key={s.value} value={s.value} disabled={s.disabled}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {steps.map((s) => (
              <TabsContent key={s.value} value={s.value} className="pt-2">
                {s.content}
              </TabsContent>
            ))}
          </Tabs>
        </RegisterContext.Provider>

        <DialogFooter className="sm:justify-between">
          <div>
            {prevStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onActiveChange(prevStep.value)}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handlePrimary} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {primaryLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
