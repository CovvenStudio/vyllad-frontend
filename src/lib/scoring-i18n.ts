/**
 * scoring-i18n.ts
 *
 * Translates English strings stored in MongoDB (ScoringFactorDefinition,
 * ScoringLevelDefinition, SystemScreeningQuestion) to Portuguese for display.
 *
 * The database is the source of truth and stores English strings.
 * All UI translation happens here.
 */

// ── Level labels ──────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  Ignore:     'Ignorar',
  Secondary:  'Secundário',
  Standard:   'Relevante',
  Important:  'Prioritário',
  Critical:   'Determinante',
};

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  Financial:   'Financeiro',
  Employment:  'Emprego',
  Guarantees:  'Garantias',
  Intention:   'Intenção',
};

// ── Factor labels ─────────────────────────────────────────────────────────────

const FACTOR_LABELS: Record<string, string> = {
  'Income-to-Rent Ratio':    'Rácio rendimento / renda',
  'Monthly Commitments':     'Encargos mensais',
  'Employment Type':         'Tipo de contrato',
  'Employment Duration':     'Tempo no emprego atual',
  Guarantor:                 'Fiador',
  'Household Composition':   'Agregado familiar',
  Pets:                      'Animais de estimação',
  'Move-in Urgency':         'Urgência de mudança',
  'Intended Stay Duration':  'Duração de estada pretendida',
  'Has Visited Properties':  'Visitou imóveis',
  'Motivation to Move':      'Motivação da mudança',
};

// ── Option values (stored as English keys in DB and Lead documents) ───────────

const OPTION_VALUES: Record<string, string> = {
  // urgency
  immediately:     'Imediatamente',
  within_15_days:  'Em 15 dias',
  within_1_month:  'Em 1 mês',
  just_browsing:   'Só a explorar',
  // household
  only_me:   'Só eu',
  '2_people': '2 pessoas',
  '3_people': '3 pessoas',
  '4_or_more': '4 ou mais',
  // boolean answers (pets, guarantor, hasVisited)
  yes: 'Sim',
  no:  'Não',
  // job type
  permanent_contract:  'Contrato sem termo',
  fixed_term_contract: 'Contrato a prazo',
  self_employed:       'Independente',
  student:             'Estudante',
  between_jobs:        'Entre empregos',
  other:               'Outro',
  // employment duration
  under_6_months: '< 6 meses',
  '6_to_12_months': '6–12 meses',
  '1_to_3_years': '1–3 anos',
  over_3_years:   'Mais de 3 anos',
  // stay duration
  under_1_year: '< 1 ano',
  '1_to_2_years': '1–2 anos',
  '2_to_3_years': '2–3 anos',
  '3_plus_years': '3+ anos',
  // motivation
  work_relocation:  'Relocalização por trabalho',
  better_price:     'Melhor preço',
  better_location:  'Melhor localização',
};

// ── Option verdicts (stored in English in DB, translated for display) ─────────

const VERDICTS: Record<string, string> = {
  // job type
  'maximum stability':  'máxima estabilidade',
  'reasonable stability': 'estabilidade razoável',
  'moderate risk':      'risco moderado',
  'high risk':          'risco elevado',
  'very high risk':     'risco muito elevado',
  'requires review':    'requer avaliação',
  // employment duration
  'solid stability':    'estabilidade sólida',
  'recent start':       'início recente',
  'very recent — risk': 'muito recente — risco',
  // guarantor
  'guarantor available': 'tem fiador — requisito cumprido',
  'no guarantor':        'sem fiador',
  // household
  'single occupant':     '1 pessoa',
  '2 occupants':         '2 pessoas',
  '3 occupants':         '3 pessoas',
  '4 or more occupants': '4 ou mais pessoas',
  // pets
  'has pets':  'tem animais',
  'no pets':   'sem animais',
  // urgency
  'active search — immediate decision': 'procura ativa — decisão imediata',
  'active search':       'procura ativa',
  'genuine interest':    'interesse genuíno',
  'no immediate intent': 'sem intenção imediata',
  // stay duration
  'long stay — ideal':                  'estadia longa — ideal',
  'medium stay':                        'estadia média',
  'short stay':                         'estadia curta',
  'very short stay — turnover risk':    'estadia muito curta — risco de rotatividade',
  // hasVisited
  'visited — commitment signal':            'já visitou — sinal de compromisso',
  'not visited — less consolidated intent': 'não visitou — intenção menos consolidada',
  // motivation
  'urgent and stable reason': 'motivo urgente e estável',
  'utilitarian motivation':   'motivação utilitária',
  'comfort motivation':       'motivação de conforto',
  'other reason':             'outro motivo',
};

// ── Income-ratio verdict labels ──────────────────────────────────────────────
// Scores for 4 bands above each breakpoint (plus 0 below all).
// Labels shown to the user in the Raio-X dialog.

const INCOME_RATIO_BAND_LABELS = ['abaixo do mínimo', 'mínimo (≥t₀×)', 'fraco (≥t₁×)', 'bom (≥t₂×)', 'ideal (≥t₃×)'];

/** Returns a human-readable verdict for the computed income/rent ratio.
 *  `thresholds` = [minimum, weak, good, ideal] ascending — comes from ScoringConfig.numericThresholds.incomeRatio */
export function incomeRatioVerdict(ratio: number, thresholds: number[] = [1.0, 2.0, 3.0, 3.5]): string {
  const sorted = [...thresholds].sort((a, b) => b - a); // descending
  const labels = [
    `ideal (≥${sorted[0]}×)`,
    `bom (≥${sorted[1]}×)`,
    `fraco (≥${sorted[2]}×)`,
    `mínimo (≥${sorted[3] ?? sorted[2]}×)`,
  ];
  for (let i = 0; i < sorted.length; i++) {
    if (ratio >= sorted[i]) return labels[i];
  }
  return 'abaixo do mínimo';
}

// ── Commitments verdict labels ────────────────────────────────────────────────

/** Returns a human-readable verdict for commitments as % of income.
 *  `thresholds` = [low_max, medium_max, high_max] ascending — comes from ScoringConfig.numericThresholds.commitmentsPercent */
export function commitmentsVerdict(pct: number, thresholds: number[] = [20, 40, 60]): string {
  const sorted = [...thresholds].sort((a, b) => a - b); // ascending
  const labels = [
    `baixo (< ${sorted[0]}%)`,
    `médio (${sorted[0]}–${sorted[1]}%)`,
    `elevado (${sorted[1]}–${sorted[2] ?? sorted[1] + 20}%)`,
  ];
  for (let i = 0; i < sorted.length; i++) {
    if (pct < sorted[i]) return labels[i];
  }
  return `muito elevado (≥${sorted[sorted.length - 1]}%)`;
}

// ── Public helpers ────────────────────────────────────────────────────────────
// These are thin wrappers — the source of truth is now the JSON locale files.
// Kept as standalone functions so all existing call sites remain unchanged.
// For new code, prefer using useTranslation('scoring') directly.

import i18n from '@/lib/i18n';

const ns = 'scoring';

export function tLevel(label: string):       string { return i18n.t(`${ns}:levels.${label}`,    { defaultValue: LEVEL_LABELS[label]    ?? label }); }
export function tCategory(label: string):    string { return i18n.t(`${ns}:categories.${label}`, { defaultValue: CATEGORY_LABELS[label] ?? label }); }
export function tFactor(label: string):      string { return i18n.t(`${ns}:factors.${label}`,   { defaultValue: FACTOR_LABELS[label]   ?? label }); }
export function tOptionValue(value: string): string { return i18n.t(`${ns}:options.${value}`,   { defaultValue: OPTION_VALUES[value]   ?? value }); }
export function tVerdict(verdict: string):   string { return i18n.t(`${ns}:verdicts.${verdict}`, { defaultValue: VERDICTS[verdict]      ?? verdict }); }
