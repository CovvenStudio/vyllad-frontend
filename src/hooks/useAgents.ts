import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listAgents, inviteAgent, updateAgent, removeAgent, cancelInvite } from '@/lib/agents-api';
import { monitoring } from '@/lib/monitoring/monitoring';
import type { AgentDto, PendingInviteDto } from '@/lib/agents-api';

export function useAgents() {
  const { currentAgencyId } = useAuth();
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [pending, setPending] = useState<PendingInviteDto[]>([]);
  const [ownerPlanId, setOwnerPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentAgencyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAgents(currentAgencyId);
      setAgents(data.agents);
      setPending(data.pending);
      setOwnerPlanId(data.ownerPlanId ?? null);
    } catch (err) {
      monitoring.captureException(err, { context: 'load-agents' });
      setError('Erro ao carregar agentes.');
    } finally {
      setLoading(false);
    }
  }, [currentAgencyId]);

  useEffect(() => { load(); }, [load]);

  const invite = useCallback(async (email: string, role: string, phone?: string) => {
    if (!currentAgencyId) return;
    await inviteAgent(currentAgencyId, { email, phone, role });
    await load();
  }, [currentAgencyId, load]);

  const update = useCallback(async (membershipId: string, phone?: string) => {
    if (!currentAgencyId) return;
    await updateAgent(currentAgencyId, membershipId, { phone });
    await load();
  }, [currentAgencyId, load]);

  const remove = useCallback(async (membershipId: string) => {
    if (!currentAgencyId) return;
    await removeAgent(currentAgencyId, membershipId);
    await load();
  }, [currentAgencyId, load]);

  const removeInvite = useCallback(async (inviteId: string) => {
    if (!currentAgencyId) return;
    await cancelInvite(currentAgencyId, inviteId);
    await load();
  }, [currentAgencyId, load]);

  return { agents, pending, ownerPlanId, loading, error, invite, update, remove, removeInvite, refresh: load };
}
