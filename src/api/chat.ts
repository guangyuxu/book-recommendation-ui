import { useQuery } from "@tanstack/react-query";
import { getHistory, listThreads } from "@/lib/chatApi";

export const threadsKey = ["threads"] as const;
export const threadHistoryKey = (threadId: string) =>
  ["threads", threadId, "history"] as const;

// Conversations for the sidebar (scoped to the caller's family by the service).
export function useThreads() {
  return useQuery({
    queryKey: threadsKey,
    queryFn: () => listThreads(),
  });
}

// Full message transcript for one conversation. Disabled until a threadId is known
// (i.e. a brand-new, not-yet-created chat).
export function useThreadHistory(threadId: string | undefined) {
  return useQuery({
    queryKey: threadHistoryKey(threadId ?? ""),
    queryFn: () => getHistory(threadId as string),
    enabled: Boolean(threadId),
  });
}
