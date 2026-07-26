// Types for the chat feature. The UI talks to the BFF/service (`/api/chat/*`), which proxies the
// LangGraph agent and re-emits its run as Server-Sent Events. Kept in sync with the service's SSE
// contract in book-recommendation-service/src/service/routers/chat.py.

// One pipeline stage the agent reported via an `update` SSE event (a LangGraph `updates`-mode
// chunk keyed by node name). Surfaced as the inline "thinking" trace on the assistant bubble.
export interface ChatStep {
  node: string; // the graph node name, e.g. "plan" | "execute"
  label: string; // human-facing label derived from the node name
}

// A rendered chat message in the transcript.
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // True while the assistant bubble is still being streamed into.
  streaming?: boolean;
  // Pipeline stages seen for this turn, in arrival order (assistant messages only).
  steps?: ChatStep[];
}

// A conversation in the sidebar. A conversation IS a LangGraph thread, bound to one child for its
// whole lifetime (child_id, chosen when the chat is created; null = agent resolves it).
export interface ThreadSummary {
  thread_id: string;
  title: string;
  created_at?: string;
  child_id?: string | null;
}

// POST /api/chat/threads -> { thread_id, child_id }
export interface NewThreadResponse {
  thread_id: string;
  child_id?: string | null;
}

// The agent's HITL interrupt, surfaced by the service as a `confirmation_request` event. Kept as a
// permissive bag (agent-defined) so the stream client stays decoupled; the confirmation UI narrows
// it via `parseConfirmation` below. Mirrors ConfirmationRequest in the agent
// (book-recommendation-agent/src/agent/memory/schemas.py).
export type ConfirmationRequest = Record<string, unknown>;

// The child fields the agent proposes to save (agent ChildRecord).
export interface ConfirmChildRecord {
  display_name?: string | null;
  aliases?: string[] | null;
  gender?: string | null;
  birth_date?: string | null;
  grade?: string | null;
  primary_language?: string | null;
  reading_language?: string | null;
}

// The family-member fields the agent proposes to write (agent MemberRecord).
export interface ConfirmMemberRecord {
  display_name?: string | null;
  role?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  language_preference?: string | null;
}

// The narrowed confirmation payload the UI renders.
export interface ParsedConfirmation {
  kind: "save_child" | "profile_update" | string;
  question: string;
  child: ConfirmChildRecord | null;
  member: ConfirmMemberRecord | null;
}

// The resume decision POSTed to /api/chat/threads/{id}/resume (service ResumeRequest).
export interface ResumeDecision {
  approved: boolean;
  child?: Record<string, unknown> | null;
  member?: Record<string, unknown> | null;
}

// Callbacks a caller supplies to drive a streamed turn. Every terminal path ends with onDone.
export interface StreamHandlers {
  onToken?: (text: string) => void;
  onUpdate?: (data: unknown) => void;
  onConfirmation?: (payload: ConfirmationRequest) => void;
  onUsage?: (data: unknown) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

// --- LangGraph history shapes (subset we read) ---
// GET /api/chat/threads/{id}/history returns newest-first thread-state snapshots. The latest
// snapshot's `values.messages` holds the full accumulated LangChain message list.
export interface LangChainMessage {
  id?: string;
  type?: string; // "human" | "ai" | "AIMessageChunk" | "tool" | "system" | ...
  role?: string; // some serializations use role instead of type
  content?: unknown; // string | Array<{ type: string; text?: string }>
}

export interface ThreadStateSnapshot {
  values?: { messages?: LangChainMessage[] } & Record<string, unknown>;
  created_at?: string;
  metadata?: Record<string, unknown>;
  // Present when the run paused mid-graph: the pending HITL interrupt lives on the task that
  // called interrupt(), as tasks[].interrupts[].value. `next` is the not-yet-run nodes.
  next?: string[];
  tasks?: Array<{ name?: string; interrupts?: Array<{ value?: unknown }> }>;
}

// What loading one conversation yields: the transcript plus any pending confirmation that the
// thread is currently blocked on (so a reload restores the Save/Don't-save card).
export interface ThreadLoad {
  messages: ChatMessage[];
  pending: ConfirmationRequest | null;
}
