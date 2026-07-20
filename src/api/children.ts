import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Child, ChildCreate, ChildUpdate } from "@/types/api";

const childrenKey = ["children"] as const;

export function useChildren() {
  return useQuery({
    queryKey: childrenKey,
    queryFn: () => api.get<Child[]>("/family/children"),
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChildCreate) =>
      api.post<Child>("/family/children", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: childrenKey }),
  });
}

export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChildUpdate }) =>
      api.patch<Child>(`/family/children/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: childrenKey }),
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/family/children/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: childrenKey }),
  });
}
