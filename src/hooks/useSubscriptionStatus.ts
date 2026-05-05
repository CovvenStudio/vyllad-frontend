import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { monitoring } from '@/lib/monitoring/monitoring';

export interface SubscriptionStatus {
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planName: string | null;
  planMaxProperties: number | null;
  planMaxLeadsPerProperty: number | null;
  planMaxAgents: number | null;
  effectiveMaxProperties: number | null;
  effectiveMaxAgents: number | null;
  effectiveMaxLeads: number | null;
  hasPropertyGrant: boolean;
  hasAgentGrant: boolean;
  hasLeadsGrant: boolean;
  extraLeads: number;
  extraLeadsPerUnit: number | null;
  extraLeadPricePerUnit: number | null;
  extraLeadCurrency: string | null;
  supportsExtraLeads: boolean;
}

export function useSubscriptionStatus() {
  const { status: authStatus } = useAuth();

  const query = useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status'],
    queryFn: () => apiFetch<SubscriptionStatus>('/subscriptions/status'),
    enabled: authStatus === 'authenticated',
    staleTime: 60_000,
    throwOnError: false,
  });

  useEffect(() => {
    if (query.error) {
      monitoring.captureException(query.error, { context: 'load-subscription-status' });
    }
  }, [query.error]);

  return {
    subStatus: query.data ?? null,
    isLoading: query.isLoading,
  };
}
