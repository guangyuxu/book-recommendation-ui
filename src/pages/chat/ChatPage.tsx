import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveChild } from "@/child/context";
import { threadsKey, useThreadHistory, useThreads } from "@/api/chat";
import { childrenKey } from "@/api/children";
import {
  createThread,
  setThreadChild,
  streamResume,
  streamTurn,
} from "@/lib/chatApi";
import { useSyncOnChange } from "@/lib/syncOnChange";
import { Button } from "@/components/ui/button";
import type {
  ChatMessage,
  ChatStep,
  ConfirmationRequest,
  ConfirmChildRecord,
  ConfirmMemberRecord,
  ParsedConfirmation,
  StreamHandlers,
} from "@/types/chat";

function uid(): string {
  return crypto.randomUUID();
}

// Human labels for the agent's top-level pipeline nodes (see the graph in
// book-recommendation-agent/src/agent/graph.py). `respond` is intentionally absent — its output IS
// the streamed answer, so it would be a redundant step. Unknown nodes fall back to a title-cased
// name so a new stage still shows something sensible.
const STEP_LABELS: Record<string, string> = {
  guard: "Checking your message",
  load_context: "Loading your family profile",
  understand: "Understanding your request",
  plan: "Planning",
  clarify: "Getting ready",
  execute: "Finding books",
  memory: "Updating profile",
};

function stepLabel(node: string): string | null {
  if (node === "respond") return null; // the answer itself, not a step
  if (node in STEP_LABELS) return STEP_LABELS[node];
  return node.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// An `update` event is a LangGraph `updates`-mode chunk: { <nodeName>: <stateDelta> }. Turn its
// node keys into new steps we haven't recorded yet for this turn.
function stepsFromUpdate(data: unknown, seen: Set<string>): ChatStep[] {
  if (!data || typeof data !== "object") return [];
  const out: ChatStep[] = [];
  for (const node of Object.keys(data as Record<string, unknown>)) {
    if (node === "__interrupt__" || seen.has(node)) continue;
    const label = stepLabel(node);
    if (label) out.push({ node, label });
  }
  return out;
}

// The agent signals a mid-conversation child change by writing `target_child_id` (and, for a
// confident switch to another existing child, a `child_switch {to, to_name}`) into a node's
// `updates` chunk. Scan all node deltas and surface whichever it carries.
interface ChildSwitch {
  to: string;
  toName: string | null;
}

function switchFromUpdate(data: unknown): {
  target: string | null;
  switched: ChildSwitch | null;
} {
  const out: { target: string | null; switched: ChildSwitch | null } = {
    target: null,
    switched: null,
  };
  if (!data || typeof data !== "object") return out;
  for (const node of Object.values(data as Record<string, unknown>)) {
    if (!node || typeof node !== "object") continue;
    const n = node as Record<string, unknown>;
    if (typeof n.target_child_id === "string") out.target = n.target_child_id;
    const cs = n.child_switch;
    if (cs && typeof cs === "object") {
      const to = (cs as Record<string, unknown>).to;
      const toName = (cs as Record<string, unknown>).to_name;
      if (typeof to === "string" && to) {
        out.switched = {
          to,
          toName: typeof toName === "string" ? toName : null,
        };
      }
    }
  }
  return out;
}

// A pending agent-side switch awaiting the user's confirmation before the thread is re-bound.
interface PendingSwitch {
  threadId: string;
  to: string;
  toName: string | null;
}

export function ChatPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { activeChildId, setActiveChildId, activeChild } = useActiveChild();
  const threads = useThreads();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ConfirmationRequest | null>(null);
  // An agent-side switch to another existing child, waiting on the user's confirmation to re-bind.
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(
    null,
  );

  // Tracks which thread's transcript is currently in `messages`, so an in-flight stream (or a
  // just-created thread) is never clobbered by a stale history fetch.
  const loadedRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The thread + child a turn actually ran against (the closure's threadId is stale for a brand-new
  // chat), plus what the agent resolved this turn — read at onDone to decide whether to re-bind.
  const turnThreadRef = useRef<string | undefined>(undefined);
  const turnBoundChildRef = useRef<string | null>(null);
  const turnTargetRef = useRef<string | null>(null);
  const turnSwitchRef = useRef<ChildSwitch | null>(null);

  const history = useThreadHistory(threadId);

  // Route changed (opened a different conversation, or "New chat"): reset the transcript.
  useEffect(() => {
    if (loadedRef.current !== threadId) {
      controllerRef.current?.abort();
      setMessages([]);
      setPending(null);
      setPendingSwitch(null);
      setSending(false);
      loadedRef.current = undefined;
    }
  }, [threadId]);

  // Hydrate from the server the first time we land on an existing conversation. Also restore any
  // pending confirmation, so reloading a thread that's paused on an interrupt re-shows the card
  // (otherwise the run is silently stranded).
  useEffect(() => {
    if (threadId && history.data && loadedRef.current !== threadId) {
      setMessages(history.data.messages);
      setPending(history.data.pending);
      loadedRef.current = threadId;
    }
  }, [threadId, history.data]);

  // Reflect the open conversation's child in the sidebar switcher: a thread is bound to one child,
  // so opening it makes that child active. (Older threads with no bound child leave the selection
  // as-is.)
  useEffect(() => {
    if (!threadId) return;
    const summary = threads.data?.find((t) => t.thread_id === threadId);
    if (summary?.child_id) setActiveChildId(summary.child_id);
  }, [threadId, threads.data, setActiveChildId]);

  // Abort any live stream on unmount.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // --- transcript mutators ---
  const startAssistant = useCallback((): string => {
    const id = uid();
    setMessages((m) => [
      ...m,
      { id, role: "assistant", content: "", streaming: true },
    ]);
    return id;
  }, []);

  // Re-bind a thread to the child the agent resolved, and reflect it in the switcher. Used both for
  // a confirmed sibling switch and for a just-created child (whose creation was already confirmed).
  const adoptChild = useCallback(
    async (threadId: string, childId: string) => {
      try {
        await setThreadChild(threadId, childId);
      } catch {
        toast.error("Couldn't switch this chat's child.");
        return;
      }
      setActiveChildId(childId);
      void qc.invalidateQueries({ queryKey: threadsKey });
      void qc.invalidateQueries({ queryKey: childrenKey });
    },
    [qc, setActiveChildId],
  );

  const streamHandlers = useCallback(
    (assistantId: string): StreamHandlers => ({
      onToken: (text) =>
        setMessages((m) =>
          m.map((x) =>
            x.id === assistantId ? { ...x, content: x.content + text } : x,
          ),
        ),
      onUpdate: (data) => {
        // Capture any child the agent resolved this turn (surfaced at onDone).
        const { target, switched } = switchFromUpdate(data);
        if (target) turnTargetRef.current = target;
        if (switched) turnSwitchRef.current = switched;
        setMessages((m) =>
          m.map((x) => {
            if (x.id !== assistantId) return x;
            const seen = new Set((x.steps ?? []).map((s) => s.node));
            const added = stepsFromUpdate(data, seen);
            return added.length
              ? { ...x, steps: [...(x.steps ?? []), ...added] }
              : x;
          }),
        );
      },
      onConfirmation: (payload) => setPending(payload),
      onError: (msg) => toast.error(msg),
      onDone: () => {
        setMessages((m) =>
          m.map((x) => (x.id === assistantId ? { ...x, streaming: false } : x)),
        );
        setSending(false);
        void qc.invalidateQueries({ queryKey: threadsKey });

        // Reconcile an agent-side child change against what this thread was bound to.
        const tid = turnThreadRef.current;
        const bound = turnBoundChildRef.current;
        const target = turnTargetRef.current;
        const switched = turnSwitchRef.current;
        turnTargetRef.current = null;
        turnSwitchRef.current = null;
        if (tid && target && target !== bound) {
          if (switched && switched.to === target) {
            // A deliberate switch to another existing child: confirm before re-binding.
            setPendingSwitch({
              threadId: tid,
              to: target,
              toName: switched.toName,
            });
          } else {
            // A newly created child (its creation was already confirmed via the save card): adopt.
            void adoptChild(tid, target);
          }
        }
      },
    }),
    [qc, adoptChild],
  );

  // --- actions ---
  const send = useCallback(async () => {
    const message = input.trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: uid(), role: "user", content: message }]);

    let tid = threadId;
    if (!tid) {
      try {
        // Bind the new conversation to the child selected in the sidebar switcher.
        tid = await createThread(activeChildId);
      } catch {
        toast.error("Could not start a conversation.");
        setSending(false);
        return;
      }
      // Adopt the new thread without letting the reset/hydrate effects wipe the live transcript.
      loadedRef.current = tid;
      navigate(`/c/${tid}`, { replace: true });
    }

    // Record what this turn runs against (the closure's threadId is stale for a brand-new chat).
    turnThreadRef.current = tid;
    turnBoundChildRef.current = activeChildId;
    const assistantId = startAssistant();
    controllerRef.current = streamTurn(
      tid,
      { message },
      streamHandlers(assistantId),
    );
  }, [
    input,
    sending,
    threadId,
    activeChildId,
    navigate,
    startAssistant,
    streamHandlers,
  ]);

  const respondConfirmation = useCallback(
    (approved: boolean) => {
      if (!threadId) return;
      setPending(null);
      setSending(true);
      // A resume can create a child (approved save) and switch the target — reconcile at onDone.
      turnThreadRef.current = threadId;
      turnBoundChildRef.current = activeChildId;
      const assistantId = startAssistant();
      controllerRef.current = streamResume(
        threadId,
        { approved },
        streamHandlers(assistantId),
      );
    },
    [threadId, activeChildId, startAssistant, streamHandlers],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <BookOpen className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold">What should we read next?</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Ask for book recommendations for your child — by age, reading level,
            interests, or a series you already love.
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {pending && (
              <ConfirmationCard
                payload={pending}
                disabled={sending}
                onDecision={respondConfirmation}
              />
            )}
            {pendingSwitch && !sending && (
              <SwitchConfirmCard
                toName={pendingSwitch.toName}
                currentName={activeChild?.display_name ?? null}
                onKeep={() => {
                  void adoptChild(pendingSwitch.threadId, pendingSwitch.to);
                  setPendingSwitch(null);
                }}
                onDismiss={() => setPendingSwitch(null)}
              />
            )}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message BookRec…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            className="rounded-full"
            disabled={!input.trim() || sending}
            onClick={() => void send()}
          >
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          BookRec can make mistakes. Double-check recommendations before buying.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const streaming = !!message.streaming;
  const thinking = streaming && !message.content; // no answer text yet
  const showTrace = (message.steps?.length ?? 0) > 0 || thinking;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {showTrace && (
          <ThinkingTrace
            steps={message.steps ?? []}
            streaming={streaming}
            thinking={thinking}
          />
        )}
        {message.content && (
          <div className="whitespace-pre-wrap rounded-2xl bg-secondary px-4 py-2 text-sm">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

// The inline "thinking" trace: each completed pipeline stage with a check, an active spinner row
// while the agent is still working before the first answer token, and a one-line collapsed summary
// once the turn is done. Expanded while streaming; auto-collapses on completion (user can reopen).
function ThinkingTrace({
  steps,
  streaming,
  thinking,
}: {
  steps: ChatStep[];
  streaming: boolean;
  thinking: boolean;
}) {
  // Seeded from `streaming` rather than always-true-then-collapsed-by-an-effect: a trace mounted
  // for an already-finished turn must render collapsed in its first frame, not expand and snap shut.
  const [open, setOpen] = useState(streaming);
  useSyncOnChange([streaming], () => {
    if (!streaming) setOpen(false);
  });

  const header = streaming
    ? "Thinking…"
    : `Thought for ${steps.length} step${steps.length === 1 ? "" : "s"}`;

  return (
    <div className="rounded-xl border border-input bg-card/50 px-3 py-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 font-medium text-muted-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {streaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {header}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-1">
          {steps.map((s) => (
            <li
              key={s.node}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              {s.label}
            </li>
          ))}
          {thinking && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              Working…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Narrow the agent-defined confirmation bag into the fields we render. Defensive: any missing/odd
// field just renders blank rather than throwing.
function parseConfirmation(payload: ConfirmationRequest): ParsedConfirmation {
  const kind = typeof payload.kind === "string" ? payload.kind : "";
  const question =
    typeof payload.question === "string" && payload.question
      ? payload.question
      : "Please confirm before I save this.";
  const child =
    payload.child && typeof payload.child === "object"
      ? (payload.child as ConfirmChildRecord)
      : null;
  const member =
    payload.member && typeof payload.member === "object"
      ? (payload.member as ConfirmMemberRecord)
      : null;
  return { kind, question, child, member };
}

// [label, value] rows for the present, non-empty fields of a record, in display order.
function childRows(c: ConfirmChildRecord): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    ["Name", c.display_name],
    ["Also called", c.aliases?.length ? c.aliases.join(", ") : null],
    ["Gender", c.gender],
    ["Birth date", c.birth_date],
    ["Grade", c.grade],
    ["Primary language", c.primary_language],
    ["Reading language", c.reading_language],
  ];
  return rows.filter(([, v]) => v != null && v !== "") as [string, string][];
}

function memberRows(mem: ConfirmMemberRecord): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    ["Name", mem.display_name],
    ["Role", mem.role],
    ["Gender", mem.gender],
    ["Birth date", mem.birth_date],
    ["Language", mem.language_preference],
  ];
  return rows.filter(([, v]) => v != null && v !== "") as [string, string][];
}

// Shown when the agent switched the conversation to another existing child. Re-binding the thread
// is gated behind the user's confirmation (the turn already answered for the new child; this
// decides whether the whole chat follows).
function SwitchConfirmCard({
  toName,
  currentName,
  onKeep,
  onDismiss,
}: {
  toName: string | null;
  currentName: string | null;
  onKeep: () => void;
  onDismiss: () => void;
}) {
  const to = toName || "this child";
  return (
    <div className="rounded-2xl border border-input bg-card p-4 text-sm shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Switch child
      </p>
      <p className="mb-3 mt-0.5 font-medium">
        This chat looks like it&apos;s now about {to}. Keep recommending for{" "}
        {to}?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onKeep}>
          Keep on {to}
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          {currentName ? `Stay on ${currentName}` : "Don't switch"}
        </Button>
      </div>
    </div>
  );
}

function ConfirmationCard({
  payload,
  disabled,
  onDecision,
}: {
  payload: ConfirmationRequest;
  disabled: boolean;
  onDecision: (approved: boolean) => void;
}) {
  const { kind, question, child, member } = parseConfirmation(payload);
  const rows = child ? childRows(child) : member ? memberRows(member) : [];
  const heading =
    kind === "save_child"
      ? "New child profile"
      : kind === "profile_update"
        ? "Profile update"
        : "Confirm";

  return (
    <div className="rounded-2xl border border-input bg-card p-4 text-sm shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {heading}
      </p>
      <p className="mb-3 mt-0.5 font-medium">{question}</p>
      {rows.length > 0 ? (
        <dl className="mb-3 divide-y divide-border rounded-lg border border-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 px-3 py-1.5">
              <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mb-3 text-muted-foreground">No details to review.</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={() => onDecision(true)}>
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onDecision(false)}
        >
          Don&apos;t save
        </Button>
      </div>
    </div>
  );
}
