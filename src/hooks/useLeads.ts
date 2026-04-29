import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listLeads, updateLeadStatus, getScoringConfig } from '@/lib/leads-api';
import type { LeadDto, ScoringConfigDto } from '@/lib/leads-api';
import type { Candidate } from '@/lib/types';

// ── Map backend LeadDto → frontend Candidate shape ───────────────────────────

const PEOPLE_MAP: Record<string, number> = {
  // English keys (new)
  'only_me': 1, '2_people': 2, '3_people': 3, '4_or_more': 4,
  // Portuguese legacy
  'Só eu': 1, '2 pessoas': 2, '3 pessoas': 3, '4 ou mais': 4,
};

function mapEmploymentDuration(raw: string): number {
  switch (raw) {
    // English keys (new)
    case 'under_6_months':  return 3;
    case '6_to_12_months':  return 9;
    case '1_to_3_years':    return 24;
    case 'over_3_years':    return 48;
    // Portuguese legacy
    case '< 6 meses':       return 3;
    case '6–12 meses':      return 9;
    case '1–3 anos':         return 24;
    case 'Mais de 3 anos':  return 48;
    default:                return 0;
  }
}

function leadToCandidate(l: LeadDto): Candidate {
  return {
    // Spread raw fields first so mapped fields can override them
    ...(l as unknown as object),
    id:               l.id,
    propertyId:       l.propertyId,
    name:             l.name,
    email:            l.email,
    phone:            l.phone,
    monthlyIncome:    parseFloat(l.income) || 0,
    numberOfPeople:   PEOPLE_MAP[l.household] ?? 1,
    hasPets:          l.hasPets,
    petDetails:       l.petTypes.join(', ') || undefined,
    hasGuarantor:     l.hasGuarantor === 'yes' || l.hasGuarantor === 'Sim',
    employmentType:   mapJob(l.job),
    employmentDuration: mapEmploymentDuration(l.employmentDuration),
    score:            l.score,
    factorScores:     l.factorScores ?? {},
    classification:   l.classification,
    status:           l.status as Candidate['status'],
    createdAt:        l.createdAt,
    notes:            l.notes,
    urgency:          mapUrgency(l.urgency),
    moveInTimeline:   l.urgency,
  };
}

function mapJob(job: string): Candidate['employmentType'] {
  switch (job) {
    // English keys (new)
    case 'permanent_contract':  return 'permanent';
    case 'fixed_term_contract': return 'contract';
    case 'self_employed':       return 'freelancer';
    case 'student':             return 'student';
    case 'between_jobs':        return 'other';
    // Portuguese legacy
    case 'Contrato sem termo': return 'permanent';
    case 'Contrato a prazo':   return 'contract';
    case 'Independente':       return 'freelancer';
    case 'Estudante':          return 'student';
    default:                   return 'other';
  }
}

function mapUrgency(u: string): Candidate['urgency'] {
  switch (u) {
    // English keys (new)
    case 'immediately':    return 'immediate';
    case 'within_15_days':
    case 'within_1_month': return 'soon';
    case 'just_browsing':  return 'flexible';
    // Portuguese legacy
    case 'Imediatamente': return 'immediate';
    case 'Em 15 dias':
    case 'Em 1 mês':      return 'soon';
    default:              return 'flexible';
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLeads(propertyId: string | null) {
  const { currentAgencyId } = useAuth();
  const [leads, setLeads]         = useState<LeadDto[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfigDto | null>(null);
  const [planLimit, setPlanLimit]   = useState<number | null>(null);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentAgencyId || !propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, cfg] = await Promise.all([
        listLeads(currentAgencyId, propertyId),
        getScoringConfig(currentAgencyId).catch(() => null),
      ]);
      setLeads(data.leads);
      setPlanLimit(data.planLimit);
      setLeadsTotal(data.total);
      setHiddenCount(data.hiddenCount);
      setScoringConfig(cfg);
    } catch {
      setError('Erro ao carregar candidatos.');
    } finally {
      setLoading(false);
    }
  }, [currentAgencyId, propertyId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = useCallback(async (id: string, status: string) => {
    if (!currentAgencyId) return;
    await updateLeadStatus(currentAgencyId, id, status);
    await load();
  }, [currentAgencyId, load]);

  const candidates = leads.map(l => {
    const c = leadToCandidate(l);
    if (scoringConfig) {
      const thr = scoringConfig.thresholds ?? { excellent: 70, potential: 45 };
      c.classification =
        c.score >= thr.excellent ? 'excellent' :
        c.score >= thr.potential ? 'potential' : 'low';
    }
    return c;
  });

  return { leads, candidates, scoringConfig, loading, error, refresh: load, setStatus, planLimit, leadsTotal, hiddenCount };
}
