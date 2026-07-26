// Chat client for the BFF/service. JSON helpers for threads/history plus SSE streaming for turns
// and HITL resume. The browser calls the service directly by absolute URL (CORS-enabled); its
// routes live under `/chat`, so the default base includes that segment.
//
// Auth reuses the accounts client's in-memory token and its single refresh-coordination point
// (lib/api.ts): every request carries the Bearer token; on a 401 we refresh once and retry, and if
// refresh ultimately fails we drop to the logged-out state. SSE can't use EventSource (no auth
// header), so we POST via fetch and parse the `text/event-stream` body ourselves.

import { ApiError, getAccessToken, notifyAuthFailure, refreshAccessToken } from "./api";
import type {
  ChatMessage,
  ConfirmationRequest,
  LangChainMessage,
  NewThreadResponse,
  ResumeDecision,
  StreamHandlers,
  ThreadLoad,
  ThreadStateSnapshot,
  ThreadSummary,
} from "@/types/chat";

const CHAT_BASE = import.meta.env.VITE_CHAT_BASE_URL ?? "http://localhost:8000/chat";

interface ChatFetchOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  // Ask for a stream; skips JSON Content-Type negotiation on the response.
  stream?: boolean;
}

function authHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// One fetch with Bearer auth + a single transparent refresh-retry on 401.
async function chatFetch(path: string, opts: ChatFetchOptions = {}): Promise<Response> {
  const doFetch = () =>
    fetch(`${CHAT_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        ...authHeaders(opts.body !== undefined),
        ...(opts.stream ? { Accept: "text/event-stream" } : {}),
      },
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      notifyAuthFailure();
    }
  }
  return res;
}

async function chatJson<T>(path: string, opts: ChatFetchOptions = {}): Promise<T> {
  const res = await chatFetch(path, opts);
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || "chat request failed");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- JSON endpoints ---
// Create a conversation bound to `childId` (chosen in the sidebar switcher). The child is fixed on
// the thread server-side, so later turns/resume don't re-send it.
export async function createThread(
  childId?: string | null,
): Promise<string> {
  const res = await chatJson<NewThreadResponse>("/threads", {
    method: "POST",
    body: { child_id: childId ?? null },
  });
  return res.thread_id;
}

// Re-bind an existing conversation to a different child (after the user confirms an agent-side
// switch). Server-side the thread's metadata child_id is updated; later turns then target it.
export async function setThreadChild(
  threadId: string,
  childId: string | null,
): Promise<void> {
  await chatJson<NewThreadResponse>(`/threads/${threadId}/child`, {
    method: "PUT",
    body: { child_id: childId },
  });
}

export async function listThreads(): Promise<ThreadSummary[]> {
  const raw = await chatJson<Array<Record<string, unknown>>>("/threads");
  return raw.map(toThreadSummary);
}

export async function getHistory(threadId: string): Promise<ThreadLoad> {
  const states = await chatJson<ThreadStateSnapshot[]>(
    `/threads/${threadId}/history`,
  );
  return {
    messages: historyToMessages(states),
    pending: pendingFromHistory(states),
  };
}

// A thread that paused on an interrupt carries the pending confirmation in its newest snapshot
// (tasks[].interrupts[].value). Recovering it here lets a page reload re-show the Save/Don't-save
// card instead of silently stranding the run. Returns null for a normal (non-interrupted) thread.
export function pendingFromHistory(
  states: ThreadStateSnapshot[],
): ConfirmationRequest | null {
  const latest = states[0];
  if (!latest) return null;
  for (const task of latest.tasks ?? []) {
    const value = task.interrupts?.[0]?.value;
    if (value && typeof value === "object") {
      return value as ConfirmationRequest;
    }
  }
  return null;
}

// --- streaming ---
export function streamTurn(
  threadId: string,
  turn: { message: string },
  handlers: StreamHandlers,
): AbortController {
  const controller = new AbortController();
  // The child is bound to the thread at creation; the server reads it from thread metadata.
  const body: Record<string, unknown> = { message: turn.message };
  void runStream(`/threads/${threadId}/messages`, body, handlers, controller.signal);
  return controller;
}

export function streamResume(
  threadId: string,
  decision: ResumeDecision,
  handlers: StreamHandlers,
): AbortController {
  const controller = new AbortController();
  void runStream(
    `/threads/${threadId}/resume`,
    decision as unknown as Record<string, unknown>,
    handlers,
    controller.signal,
  );
  return controller;
}

async function runStream(
  path: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await chatFetch(path, { method: "POST", body, stream: true, signal });
  } catch (err) {
    if (signal.aborted) return;
    handlers.onError?.(err instanceof Error ? err.message : "network error");
    handlers.onDone?.();
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError?.(`stream failed (${res.status})`);
    handlers.onDone?.();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatchFrame(frame, handlers);
      }
    }
  } catch (err) {
    if (!signal.aborted) {
      handlers.onError?.(err instanceof Error ? err.message : "stream error");
    }
  } finally {
    handlers.onDone?.();
  }
}

// Parse one SSE frame ("event: x\n data: {...}") and dispatch it to the right handler.
function dispatchFrame(frame: string, handlers: StreamHandlers): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  if (dataLines.length === 0) return;
  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return; // ignore malformed frames
  }

  switch (event) {
    case "token": {
      const text = tokenText(data);
      if (text) handlers.onToken?.(text);
      break;
    }
    case "confirmation_request":
      handlers.onConfirmation?.(data as Record<string, unknown>);
      break;
    case "usage":
      handlers.onUsage?.(data);
      break;
    case "update":
      handlers.onUpdate?.(data);
      break;
    case "error":
      handlers.onError?.(
        (data as { message?: string })?.message ?? "agent error",
      );
      break;
    // "done" falls through: onDone is always called by runStream's finally.
    default:
      break;
  }
}

// A `token` event carries the agent's LangGraph `messages`-mode part: [message, metadata].
// We render only assistant (AI) text; tool/human chunks are skipped.
function tokenText(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) return "";
  const msg = data[0] as LangChainMessage;
  const kind = (msg?.type ?? msg?.role ?? "").toLowerCase();
  if (!kind.startsWith("ai")) return "";
  return extractText(msg?.content);
}

// LangChain content is either a plain string or a list of blocks ({ type: "text", text }).
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) =>
        typeof block === "string"
          ? block
          : typeof (block as { text?: unknown })?.text === "string"
            ? (block as { text: string }).text
            : "",
      )
      .join("");
  }
  return "";
}

// --- history / thread mapping ---
export function historyToMessages(states: ThreadStateSnapshot[]): ChatMessage[] {
  // Newest snapshot first; its values.messages is the full accumulated list.
  const messages = states[0]?.values?.messages ?? [];
  const out: ChatMessage[] = [];
  messages.forEach((m, i) => {
    const kind = (m.type ?? m.role ?? "").toLowerCase();
    const role: ChatMessage["role"] | null = kind.startsWith("human")
      ? "user"
      : kind.startsWith("ai")
        ? "assistant"
        : null;
    if (!role) return; // skip tool/system messages
    const content = extractText(m.content);
    if (!content.trim()) return;
    out.push({ id: m.id ?? `${role}-${i}`, role, content });
  });
  return out;
}

function toThreadSummary(t: Record<string, unknown>): ThreadSummary {
  const threadId = String(t.thread_id ?? t.id ?? "");
  const values = t.values as { messages?: LangChainMessage[] } | undefined;
  const firstUser = values?.messages?.find((m) =>
    (m.type ?? m.role ?? "").toLowerCase().startsWith("human"),
  );
  const derived = firstUser ? extractText(firstUser.content).trim() : "";
  const created = typeof t.created_at === "string" ? t.created_at : undefined;
  const metadata = (t.metadata ?? {}) as { child_id?: unknown };
  const childId =
    typeof metadata.child_id === "string" ? metadata.child_id : null;
  return {
    thread_id: threadId,
    title: derived || fallbackTitle(created, threadId),
    created_at: created,
    child_id: childId,
  };
}

function fallbackTitle(created: string | undefined, threadId: string): string {
  if (created) {
    const d = new Date(created);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return `Chat ${threadId.slice(0, 8)}`;
}
