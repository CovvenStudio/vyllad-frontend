import { apiFetch } from './api-client';

export interface AgentDto {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'MANAGER' | 'AGENT';
  joinedAt: string;
}

export interface PendingInviteDto {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  expired: boolean;
}

export interface AgentsListResponse {
  agents: AgentDto[];
  pending: PendingInviteDto[];
  ownerPlanId: string | null;
}

export const listAgents = (agencyId: string) =>
  apiFetch<AgentsListResponse>(`/agencies/${agencyId}/agents`);

export const inviteAgent = (agencyId: string, data: { email: string; phone?: string; role: string }) =>
  apiFetch<void>(`/agencies/${agencyId}/agents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAgent = (agencyId: string, membershipId: string, data: { phone?: string; role?: string }) =>
  apiFetch<AgentDto>(`/agencies/${agencyId}/agents/${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const removeAgent = (agencyId: string, membershipId: string) =>
  apiFetch<void>(`/agencies/${agencyId}/agents/${membershipId}`, { method: 'DELETE' });

export const cancelInvite = (agencyId: string, inviteId: string) =>
  apiFetch<void>(`/agencies/${agencyId}/agents/invites/${inviteId}`, { method: 'DELETE' });

export const resendInvite = (agencyId: string, inviteId: string) =>
  apiFetch<void>(`/agencies/${agencyId}/agents/invites/${inviteId}/resend`, { method: 'POST' });

export const getInviteInfo = (token: string) =>
  fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/invites/${token}`)
    .then(async (res) => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Convite inválido.');
      return res.json() as Promise<{ agencyName: string; email: string; expiresAt: string; valid: boolean }>;
    });

export const acceptInvite = (token: string) =>
  apiFetch<{ agencyId: string; agencyName: string }>(`/invites/${token}/accept`, { method: 'POST' });
