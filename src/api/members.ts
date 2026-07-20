import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Member,
  MemberCreate,
  MemberProfile,
  MemberProfileUpsert,
  MemberUpdate,
} from "@/types/api";

const membersKey = ["members"] as const;
const memberProfileKey = (memberId: string) =>
  ["members", memberId, "profile"] as const;

export function useMembers() {
  return useQuery({
    queryKey: membersKey,
    queryFn: () => api.get<Member[]>("/family/members"),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MemberCreate) =>
      api.post<Member>("/family/members", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MemberUpdate }) =>
      api.patch<Member>(`/family/members/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/family/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

// The 1:1 family_member_profile row. A 404 means "no profile yet" — callers treat that
// as an empty form rather than an error (the query's retry already skips 4xx).
export function useMemberProfile(memberId: string | null) {
  return useQuery({
    queryKey: memberId
      ? memberProfileKey(memberId)
      : ["member-profile", "none"],
    queryFn: () =>
      api.get<MemberProfile>(`/family/members/${memberId}/profile`),
    enabled: !!memberId,
  });
}

export function useUpsertMemberProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      body,
    }: {
      memberId: string;
      body: MemberProfileUpsert;
    }) =>
      api.put<MemberProfile>(`/family/members/${memberId}/profile`, body),
    onSuccess: (data, { memberId }) =>
      qc.setQueryData(memberProfileKey(memberId), data),
  });
}
