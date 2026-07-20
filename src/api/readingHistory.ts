import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ReadingHistoryCreate,
  ReadingHistoryEntry,
  ReadingHistoryUpdate,
} from "@/types/api";

const readingHistoryKey = (childId: string) =>
  ["children", childId, "reading-history"] as const;

export function useReadingHistory(childId: string | null) {
  return useQuery({
    queryKey: childId
      ? readingHistoryKey(childId)
      : ["reading-history", "none"],
    queryFn: () =>
      api.get<ReadingHistoryEntry[]>(
        `/family/children/${childId}/reading-history`,
      ),
    enabled: !!childId,
  });
}

export function useCreateReadingHistoryEntry(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReadingHistoryCreate) =>
      api.post<ReadingHistoryEntry>(
        `/family/children/${childId}/reading-history`,
        body,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: readingHistoryKey(childId) }),
  });
}

export function useUpdateReadingHistoryEntry(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReadingHistoryUpdate }) =>
      api.patch<ReadingHistoryEntry>(
        `/family/children/${childId}/reading-history/${id}`,
        body,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: readingHistoryKey(childId) }),
  });
}

export function useDeleteReadingHistoryEntry(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<void>(`/family/children/${childId}/reading-history/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: readingHistoryKey(childId) }),
  });
}
