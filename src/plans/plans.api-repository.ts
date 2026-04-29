// ─── Plans API Repository ─────────────────────────────────────────────────────
// Fetches plans from GET /api/plans and maps the backend shape to the
// frontend domain type (Plan). Bypasses the RawPlan adapter since the backend
// returns camelCase directly.

import { apiFetch } from '@/lib/api-client';
import type { IPlansRepository } from './plans.repository';
import type { Plan, PlanId } from './plans.types';

// Backend response shape
interface BackendPlanFeature {
  featureKey: string;
  enabled: boolean;
}

interface BackendMarketPrice {
  market: string;
  currency: string;
  price: number;
  extraLeadPrice?: number | null;
}

interface BackendPlan {
  id: string;
  name: string;
  priceCents: number | null;
  trialDays: number | null;
  maxProperties: number | null;
  maxCandidatesPerProperty: number | null;
  maxAgents: number | null;
  stripeProductId: string | null;
  stripeExtraLeadProductId: string | null;
  extraLeadsPerUnit: number | null;
  marketPrices: BackendMarketPrice[] | null;
  features: BackendPlanFeature[];
}

// Unified feature list shown on every plan card (same order, same copy)
const UNIFIED_FEATURES = [
  'Gestão e listagem de imóveis',
  'Triagem automática de candidatos',
  'Score e classificação de candidatos',
  'Agendamento de visitas online',
  'Página pública de candidatura',
  'Gestão de agentes e equipa',
  'Insights detalhados por candidato',
];

const PLAN_META: Record<string, { tagline: string; billing: Plan['billing']; highlighted: boolean; badge: string | null; cta: string }> = {
  Trial:  { tagline: 'Experimente sem compromisso',        billing: 'monthly',  highlighted: false, badge: '30 dias grátis', cta: 'Experimentar grátis' },
  Basic:  { tagline: 'Para imobiliárias em crescimento',   billing: 'monthly',  highlighted: false, badge: null,             cta: 'Começar agora'       },
  Pro:    { tagline: 'Para equipas com volume',             billing: 'monthly',  highlighted: true,  badge: 'Mais popular',    cta: 'Começar com Pro'     },
  Scale:  { tagline: 'Solução empresarial à medida',        billing: 'contact',  highlighted: false, badge: 'Empresarial',     cta: 'Falar com a equipa'  },
};

function mapBackendPlan(raw: BackendPlan): Plan {
  const planId = raw.name.toLowerCase() as PlanId;
  const meta = PLAN_META[raw.name] ?? { tagline: '', billing: 'monthly' as const, highlighted: false, badge: null, cta: 'Começar' };

  return {
    id: planId,
    backendPlanId: raw.id,
    name: raw.name,
    tagline: meta.tagline,
    price: raw.priceCents !== null ? raw.priceCents / 100 : null,
    billing: meta.billing,
    limits: {
      properties: raw.maxProperties,
      candidatesPerProperty: raw.maxCandidatesPerProperty,
      agents: raw.maxAgents,
      trialDays: raw.trialDays,
    },
    features: UNIFIED_FEATURES,
    marketPrices: raw.marketPrices
      ? raw.marketPrices.map((mp) => ({
          market: mp.market,
          currency: mp.currency,
          price: mp.price,
          extraLeadPrice: mp.extraLeadPrice ?? null,
        }))
      : null,
    extraLeadsPerUnit: raw.extraLeadsPerUnit ?? null,
    highlighted: meta.highlighted,
    badge: meta.badge,
    cta: meta.cta,
  };
}

class PlansApiRepository implements IPlansRepository {
  async fetchAll(): Promise<Plan[]> {
    const raw = await apiFetch<BackendPlan[]>('/plans');
    return raw.map(mapBackendPlan);
  }

  async fetchById(id: PlanId): Promise<Plan | null> {
    const all = await this.fetchAll();
    return all.find((p) => p.id === id) ?? null;
  }
}

export const plansApiRepository: IPlansRepository = new PlansApiRepository();
