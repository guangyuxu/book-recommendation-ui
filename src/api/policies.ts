import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/types/api";

const policiesKey = ["policies"] as const;

export function usePolicies() {
  return useQuery({
    queryKey: policiesKey,
    queryFn: () => api.get<Policy[]>("/family/policies"),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PolicyCreate) =>
      api.post<Policy>("/family/policies", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: policiesKey }),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PolicyUpdate }) =>
      api.patch<Policy>(`/family/policies/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: policiesKey }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/family/policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policiesKey }),
  });
}
