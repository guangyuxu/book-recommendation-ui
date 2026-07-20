import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Invite, InviteCreate, InviteResponse } from "@/types/api";

const invitesKey = ["invites"] as const;

export function useInvites() {
  return useQuery({
    queryKey: invitesKey,
    queryFn: () => api.get<Invite[]>("/family/invites"),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteCreate) =>
      api.post<InviteResponse>("/family/invites", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/family/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });
}
