import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Family, FamilyUpdate } from "@/types/api";

const familyKey = ["family"] as const;

export function useFamily() {
  return useQuery({
    queryKey: familyKey,
    queryFn: () => api.get<Family>("/family"),
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FamilyUpdate) => api.patch<Family>("/family", body),
    onSuccess: (data) => qc.setQueryData(familyKey, data),
  });
}
