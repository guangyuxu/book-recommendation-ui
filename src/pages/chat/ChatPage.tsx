import { ArrowUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chat is a placeholder for now: the messages area and composer are laid out, but sending is
// disabled until the recommendation backend is ready. Wire the send handler + message list then.
export function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <BookOpen className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold">What should we read next?</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Chat-based book recommendations are coming soon. For now, head to
          Settings to set up your family, members, and children.
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm">
          <textarea
            rows={1}
            disabled
            placeholder="Message BookRec… (coming soon)"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <Button size="icon" className="rounded-full" disabled>
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          The assistant isn&apos;t connected yet.
        </p>
      </div>
    </div>
  );
}
