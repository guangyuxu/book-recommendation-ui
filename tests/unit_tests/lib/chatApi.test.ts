// The pure mappers from the chat client: turning LangGraph's thread-state snapshots into what the
// transcript renders, and recovering a pending HITL interrupt after a reload. Both silently drop
// data by design (tool/system messages, empty content), so the drop rules are worth pinning.
import { describe, expect, it } from "vitest";

import { historyToMessages, pendingFromHistory } from "@/lib/chatApi";
import type { ThreadStateSnapshot } from "@/types/chat";

/** History comes back newest-snapshot-first; the newest holds the full accumulated list. */
function snapshots(...states: ThreadStateSnapshot[]): ThreadStateSnapshot[] {
  return states;
}

describe("historyToMessages", () => {
  it("maps human/ai messages and skips tool + system ones", () => {
    const out = historyToMessages(
      snapshots({
        values: {
          messages: [
            { id: "m1", type: "human", content: "any picture books?" },
            { id: "m2", type: "system", content: "you are a librarian" },
            { id: "m3", type: "tool", content: '{"results": []}' },
            { id: "m4", type: "ai", content: "Sure -- here are three." },
          ],
        },
      }),
    );

    expect(out).toEqual([
      { id: "m1", role: "user", content: "any picture books?" },
      { id: "m4", role: "assistant", content: "Sure -- here are three." },
    ]);
  });

  it("accepts `role` as well as `type`, and AIMessageChunk as assistant", () => {
    // Different LangChain serializations use different discriminators; the mapper matches on
    // prefix, so "AIMessageChunk" must land as assistant.
    const out = historyToMessages(
      snapshots({
        values: {
          messages: [
            { id: "m1", role: "human", content: "hi" },
            { id: "m2", type: "AIMessageChunk", content: "hello" },
          ],
        },
      }),
    );

    expect(out.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("flattens block-list content and drops whitespace-only messages", () => {
    const out = historyToMessages(
      snapshots({
        values: {
          messages: [
            {
              id: "m1",
              type: "ai",
              content: [
                { type: "text", text: "part one " },
                { type: "text", text: "part two" },
                { type: "image", url: "..." }, // no text -> contributes nothing
              ],
            },
            { id: "m2", type: "ai", content: "   " },
          ],
        },
      }),
    );

    expect(out).toEqual([
      { id: "m1", role: "assistant", content: "part one part two" },
    ]);
  });

  it("synthesizes an id when the message has none", () => {
    // React keys off these; a missing id must not collapse two bubbles onto one key.
    const out = historyToMessages(
      snapshots({
        values: {
          messages: [
            { type: "human", content: "a" },
            { type: "ai", content: "b" },
          ],
        },
      }),
    );

    expect(out.map((m) => m.id)).toEqual(["user-0", "assistant-1"]);
  });

  it("returns nothing for an empty or brand-new thread", () => {
    expect(historyToMessages([])).toEqual([]);
    expect(historyToMessages(snapshots({}))).toEqual([]);
    expect(historyToMessages(snapshots({ values: {} }))).toEqual([]);
  });
});

describe("pendingFromHistory", () => {
  it("recovers the interrupt payload from the newest snapshot", () => {
    // This is what lets a page reload re-show the Save / Don't-save card instead of stranding
    // the paused run.
    const pending = pendingFromHistory(
      snapshots(
        {
          tasks: [
            { name: "respond", interrupts: [] },
            {
              name: "confirm",
              interrupts: [
                { value: { kind: "save_child", question: "Save?" } },
              ],
            },
          ],
        },
        { tasks: [] }, // older snapshot -- must be ignored
      ),
    );

    expect(pending).toEqual({ kind: "save_child", question: "Save?" });
  });

  it("returns null for a normal thread", () => {
    expect(pendingFromHistory([])).toBeNull();
    expect(pendingFromHistory(snapshots({}))).toBeNull();
    expect(pendingFromHistory(snapshots({ tasks: [] }))).toBeNull();
    expect(
      pendingFromHistory(snapshots({ tasks: [{ name: "plan" }] })),
    ).toBeNull();
  });

  it("ignores a non-object interrupt value", () => {
    // A bare string interrupt is not a ConfirmationRequest; rendering it would throw downstream.
    expect(
      pendingFromHistory(
        snapshots({ tasks: [{ interrupts: [{ value: "paused" }] }] }),
      ),
    ).toBeNull();
  });
});
