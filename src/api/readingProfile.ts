import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReadingProfile, ReadingProfileUpsert } from "@/types/api";

const readingProfileKey = (childId: string) =>
  ["children", childId, "reading-profile"] as const;

export function useReadingProfile(childId: string | null) {
  return useQuery({
    queryKey: childId ? readingProfileKey(childId) : ["reading-profile", "none"],
    queryFn: () =>
      api.get<ReadingProfile>(`/family/children/${childId}/reading-profile`),
    enabled: !!childId,
  });
}

export function useUpsertReadingProfile(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReadingProfileUpsert) =>
      api.put<ReadingProfile>(
        `/family/children/${childId}/reading-profile`,
        body,
      ),
    onSuccess: (data) => qc.setQueryData(readingProfileKey(childId), data),
  });
}
