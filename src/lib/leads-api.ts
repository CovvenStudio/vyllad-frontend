import { apiFetch, BASE_URL } from './api-client';

// ── Submit lead ───────────────────────────────────────────────────────────────

export interface SubmitLeadInput {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  income: string;
  monthlyCommitments: string;
  job: string;
  employmentDuration: string;
  hasGuarantor: string;
  household: string;
  hasPets: boolean;
  petTypes: string[];
  urgency: string;
  stayDuration: string;
  hasVisited: string;
  motivation: string;
  customAnswers: Record<string, string>;
}

export interface SubmitLeadResponse {
  id: string;
  score: number;
  factorScores: Record<string, number>;
  classification: 'excellent' | 'potential' | 'low';
}

// ── Lead list ─────────────────────────────────────────────────────────────────

export interface ProposedSlotDto {
  date: string;        // "YYYY-MM-DD"
  periodLabel: string; // e.g. "Manhã"
}

export interface LeadDto {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  income: string;
  monthlyCommitments: string;
  job: string;
  employmentDuration: string;
  hasGuarantor: string;
  household: string;
  hasPets: boolean;
  petTypes: string[];
  urgency: string;
  stayDuration: string;
  hasVisited: string;
  motivation: string;
  customAnswers: Record<string, string>;
  score: number;
  factorScores: Record<string, number>;
  classification: 'excellent' | 'potential' | 'low';
  status: 'new' | 'contacted' | 'qualified' | 'rejected' | 'approved' | 'visit_scheduled' | 'visit_cancelled' | 'visit_finished' | 'contracted';
  createdAt: string;
  proposedSlots: ProposedSlotDto[];
  visitToken?: string;
  visitLinkSentAt?: string; // ISO timestamp of last visit link email
  contractedAt?: string;   // ISO timestamp when contract was signed
  proposedVisit?: string; // legacy
}

export interface LeadListResponse {
  leads: LeadDto[];
  total: number;
  /** Plan-based candidate cap for this property. null = unlimited */
  planLimit: number | null;
  /** Number of leads hidden due to plan limit (total - planLimit when over cap) */
  hiddenCount: number;
}

// ── Scoring config ────────────────────────────────────────────────────────────

export interface ScoringThresholds {
  excellent: number;
  potential: number;
}

/** Per-agency configurable breakpoints for numeric scoring factors. */
export interface NumericFactorThresholds {
  /** Income-to-rent ratio breakpoints, ascending [minimum, weak, good, ideal]. Default: [1, 2, 3, 3.5] */
  incomeRatio: number[];
  /** Monthly commitments as % of income, ascending [low_max, medium_max, high_max]. Default: [20, 40, 60] */
  commitmentsPercent: number[];
}

export const DEFAULT_NUMERIC_THRESHOLDS: NumericFactorThresholds = {
  incomeRatio:        [1.0, 2.0, 3.0, 3.5],
  commitmentsPercent: [20, 40, 60],
};

export interface ScoringFactorLevelDto {
  level: number;    // 0-4
  label: string;    // "Ignorar" … "Determinante"
  weight: number;   // 0,1,2,4,8
}

export interface ScoringFactorDefinitionDto {
  key: string;
  category: string;
  categoryLabel: string;
  label: string;
  order: number;
  /** Maps each answer option value to a human-readable verdict. Empty for numeric factors. */
  optionVerdicts: Record<string, string>;
}

export interface ScoringConfigDto {
  agencyId: string;
  profileName: string;
  thresholds: ScoringThresholds;
  numericThresholds: NumericFactorThresholds;
  /** factorKey → importance level (0-4) */
  factors: Record<string, number>;
  levelDefinitions: ScoringFactorLevelDto[];
  factorDefinitions: ScoringFactorDefinitionDto[];
}

export type SaveScoringConfigInput = Omit<ScoringConfigDto, 'agencyId' | 'levelDefinitions' | 'factorDefinitions'>;

// ── API functions ─────────────────────────────────────────────────────────────

/** Public — no auth needed */
export async function submitLead(
  slug: string,
  input: SubmitLeadInput,
): Promise<SubmitLeadResponse> {
  const res = await fetch(`${BASE_URL}/public/properties/${slug}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? 'Erro ao submeter candidatura.');
  }
  return res.json();
}

/** Authenticated */
export const listLeads = (agencyId: string, propertyId: string, skip = 0, take = 50) =>
  apiFetch<LeadListResponse>(
    `/agencies/${agencyId}/properties/${propertyId}/leads?skip=${skip}&take=${take}`,
  );

/** Authenticated — agency-wide (no property filter). Useful for appointments page. */
export const listLeadsByAgency = (agencyId: string, status?: string, skip = 0, take = 200) => {
  const qs = new URLSearchParams({ skip: String(skip), take: String(take) });
  if (status) qs.set('status', status);
  return apiFetch<LeadListResponse>(`/agencies/${agencyId}/leads?${qs.toString()}`);
};

export const updateLeadStatus = (agencyId: string, id: string, status: string) =>
  apiFetch<void>(`/agencies/${agencyId}/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ── Public: visit scheduling ──────────────────────────────────────────────────

const RAW_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface VisitInfoResponse {
  lead: {
    id: string;
    name: string;
    email: string;
    proposedSlots: ProposedSlotDto[];
  };
  property?: {
    id: string;
    title: string;
    location?: string;
  };
  schedulingConfig?: {
    periods: { label: string; start: string; end: string }[];
    availableWeekdays: number[];
    maxClientChoices: number;
    agentSlotIntervalMinutes: number;
    maxVisitsPerTime: number;
  };
  slotOccupancy: { date: string; time: string; count: number }[];
  blockedSlots: { date: string; time: string }[];
  activeAppointment?: { id: string; cancelToken: string };
}

export const getVisitInfo = (leadId: string, token: string): Promise<VisitInfoResponse> =>
  fetch(`${RAW_BASE}/public/leads/${leadId}/visit-info?token=${encodeURIComponent(token)}`)
    .then(async r => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });

export const submitProposedSlots = (
  leadId: string,
  token: string,
  slots: ProposedSlotDto[],
): Promise<void> =>
  fetch(`${RAW_BASE}/public/leads/${leadId}/proposed-slots?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slots }),
  }).then(async r => {
    if (!r.ok) throw new Error(String(r.status));
  });

export const sendVisitLink = (agencyId: string, leadId: string): Promise<void> =>
  apiFetch(`/agencies/${agencyId}/leads/${leadId}/send-visit-link`, { method: 'POST' });

export const contractLead = (agencyId: string, leadId: string): Promise<LeadDto> =>
  apiFetch<LeadDto>(`/agencies/${agencyId}/leads/${leadId}/contract`, { method: 'PATCH' });

export const revertContractLead = (agencyId: string, leadId: string): Promise<LeadDto> =>
  apiFetch<LeadDto>(`/agencies/${agencyId}/leads/${leadId}/revert-contract`, { method: 'PATCH' });

export const getScoringConfig = (agencyId: string) =>
  apiFetch<ScoringConfigDto>(`/agencies/${agencyId}/scoring-config`);

export const saveScoringConfig = (agencyId: string, dto: SaveScoringConfigInput) =>
  apiFetch<ScoringConfigDto>(`/agencies/${agencyId}/scoring-config`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });

