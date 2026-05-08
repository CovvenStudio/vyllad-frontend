import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Candidate, Property } from '@/lib/types';
import type { ScoringConfigDto, ScoringFactorLevelDto, ScoringFactorDefinitionDto, NumericFactorThresholds } from '@/lib/leads-api';
import { DEFAULT_NUMERIC_THRESHOLDS } from '@/lib/leads-api';
import { tLevel, tCategory, tFactor, tOptionValue, tVerdict, incomeRatioVerdict, commitmentsVerdict } from '@/lib/scoring-i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  candidate: Candidate;
  property: Property;
  scoringConfig: ScoringConfigDto;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FALLBACK_LEVELS: ScoringFactorLevelDto[] = [
  { level: 0, label: 'Ignore',    weight: 0 },
  { level: 1, label: 'Secondary', weight: 1 },
  { level: 2, label: 'Standard',  weight: 2 },
  { level: 3, label: 'Important', weight: 4 },
  { level: 4, label: 'Critical',  weight: 8 },
];

const FALLBACK_FACTORS: ScoringFactorDefinitionDto[] = [
  { key: 'incomeRatio',        category: 'financial',   categoryLabel: 'Financial',   label: 'Income-to-Rent Ratio',       order: 1,  optionVerdicts: {} },
  { key: 'commitments',        category: 'financial',   categoryLabel: 'Financial',   label: 'Monthly Commitments',        order: 2,  optionVerdicts: {} },
  { key: 'jobType',            category: 'employment',  categoryLabel: 'Employment',  label: 'Employment Type',            order: 3,  optionVerdicts: { permanent_contract: 'maximum stability', fixed_term_contract: 'reasonable stability', self_employed: 'moderate risk', student: 'high risk', between_jobs: 'very high risk' } },
  { key: 'employmentDuration', category: 'employment',  categoryLabel: 'Employment',  label: 'Employment Duration',        order: 4,  optionVerdicts: { over_3_years: 'solid stability', '1_to_3_years': 'reasonable stability', '6_to_12_months': 'recent start', under_6_months: 'very recent — risk' } },
  { key: 'guarantor',          category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Guarantor',                  order: 5,  optionVerdicts: { yes: 'guarantor available', no: 'no guarantor' } },
  { key: 'household',          category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Household Composition',      order: 6,  optionVerdicts: { only_me: 'single occupant', '2_people': '2 occupants', '3_people': '3 occupants', '4_or_more': '4 or more occupants' } },
  { key: 'pets',               category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Pets',                       order: 7,  optionVerdicts: { yes: 'has pets', no: 'no pets' } },
  { key: 'urgency',            category: 'intention',   categoryLabel: 'Intention',   label: 'Move-in Urgency',            order: 8,  optionVerdicts: { immediately: 'active search — immediate decision', within_15_days: 'active search', within_1_month: 'genuine interest', just_browsing: 'no immediate intent' } },
  { key: 'stayDuration',       category: 'intention',   categoryLabel: 'Intention',   label: 'Intended Stay Duration',     order: 9,  optionVerdicts: { '3_plus_years': 'long stay — ideal', '2_to_3_years': 'medium stay', '1_to_2_years': 'short stay', under_1_year: 'very short stay — turnover risk' } },
  { key: 'hasVisited',         category: 'intention',   categoryLabel: 'Intention',   label: 'Has Visited Properties',     order: 10, optionVerdicts: { yes: 'visited — commitment signal', no: 'not visited — less consolidated intent' } },
  { key: 'motivation',         category: 'intention',   categoryLabel: 'Intention',   label: 'Motivation to Move',         order: 11, optionVerdicts: { work_relocation: 'urgent and stable reason', better_price: 'utilitarian motivation', better_location: 'comfort motivation', other: 'other reason' } },
];

// Conservative default factors used when config has no factors yet
const FALLBACK_FACTOR_LEVELS: Record<string, number> = {
  incomeRatio: 4, commitments: 3, jobType: 3, employmentDuration: 2,
  guarantor: 4, household: 2, pets: 2, urgency: 2, stayDuration: 2,
  hasVisited: 1, motivation: 1,
};

function scoreColor(v: number) {
  if (v >= 80) return 'text-emerald-600';
  if (v >= 55) return 'text-amber-500';
  return 'text-destructive';
}

function Bar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 55 ? 'bg-amber-400' : 'bg-destructive/70';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold w-7 text-right ${scoreColor(value)}`}>{value}</span>
    </div>
  );
}

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  4: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

function LevelBadge({ level, levels }: { level: number; levels: ScoringFactorLevelDto[] }) {
  const def = levels.find(l => l.level === level);
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[level] ?? ''}`}>
      {tLevel(def?.label ?? `L${level}`)} {level > 0 && <span className="opacity-60">({def?.weight}×)</span>}
    </span>
  );
}

// ── Context notes per factor ──────────────────────────────────────────────────
// Option-based factors: verdict comes from def.optionVerdicts (MongoDB).
// Numeric factors (incomeRatio, commitments): verdict is computed from raw values.

function factorNote(
  key: string,
  c: Candidate,
  p: Property,
  def: ScoringFactorDefinitionDto,
  numThr: NumericFactorThresholds = DEFAULT_NUMERIC_THRESHOLDS,
  t: TFunction,
): string | null {
  const raw = c as unknown as Record<string, unknown>;
  const rent = p.rentalPrice ?? (p as any).price ?? 0;
  const income = c.monthlyIncome;

  // ── Numeric factors (computed) ──────────────────────────────────────────────
  if (key === 'incomeRatio') {
    if (rent <= 0) return null;
    const ratio = income / rent;
    return t('dashboard:xray.incomeNote', { income: income.toLocaleString('pt-PT'), rent: rent.toLocaleString('pt-PT'), ratio: ratio.toFixed(1), verdict: incomeRatioVerdict(ratio, numThr.incomeRatio) });
  }

  if (key === 'commitments') {
    const commitStr = String(raw.monthlyCommitments ?? '');
    if (!commitStr || commitStr === '0') return t('dashboard:xray.noCommitments');
    const commitAmt = parseFloat(commitStr) || 0;
    if (commitAmt > 0 && income > 0) {
      const pct = Math.round(commitAmt / income * 100);
      return t('dashboard:xray.commitmentsNote', { amount: commitAmt.toLocaleString('pt-PT'), pct, verdict: commitmentsVerdict(pct, numThr.commitmentsPercent) });
    }
    return t('dashboard:xray.commitmentsDeclared', { amount: commitStr });
  }

  // ── Guarantor: context-dependent logic ────────────────────────────────────
  if (key === 'guarantor') {
    const job = String(raw.job ?? '');
    const hasGuarantor = String(raw.hasGuarantor ?? '');
    const required = p.criteria.guarantorRequired;
    if (!required) return t('dashboard:xray.noGuarantorRequired');
    if (job === 'permanent_contract') return t('dashboard:xray.exemptPermanent');
    if (hasGuarantor === 'yes') return tVerdict(def.optionVerdicts['yes'] ?? 'guarantor available');
    if (hasGuarantor === 'no' && p.criteria.advanceWithoutGuarantor)
      return t('dashboard:xray.noGuarantorAlternative');
    return t('dashboard:xray.noGuarantorRequired2');
  }

  // ── Household: compare against property max ────────────────────────────────
  if (key === 'household') {
    const household = String(raw.household ?? '');
    const maxP = p.criteria.maxPeople ?? 99;
    const peopleMap: Record<string, number> = { only_me: 1, '2_people': 2, '3_people': 3, '4_or_more': 4 };
    const people = peopleMap[household] ?? c.numberOfPeople;
    const displayHousehold = tOptionValue(household);
    if (people <= maxP) return `${displayHousehold} — ${t('dashboard:xray.withinLimit', { max: maxP })}`;
    if (people === maxP + 1) return `${displayHousehold} — ${t('dashboard:xray.slightlyAbove', { max: maxP })}`;
    return `${displayHousehold} — ${t('dashboard:xray.exceeds', { max: maxP })}`;
  }

  // ── Pets: check property policy ────────────────────────────────────────────
  if (key === 'pets') {
    if (!c.hasPets) return tVerdict(def.optionVerdicts['no'] ?? 'no pets');
    const allowed = p.criteria.petsAllowed;
    const types = c.petDetails ? ` (${c.petDetails})` : '';
    return allowed
      ? `${t('common:yesNo.yes')}${types} — ${t('dashboard:xray.petsAllowed')}`
      : `${t('common:yesNo.yes')}${types} — ${t('dashboard:xray.petsNotAllowed')}`;
  }

  // ── All other option-based factors: data-driven from MongoDB ───────────────
  const answerKey = String(
    (key === 'employmentDuration' ? (raw.employmentDurationRaw ?? raw[key]) : undefined) ??
    raw[key] ??
    (key === 'hasVisited' ? raw.hasVisited : undefined) ??
    (key === 'urgency' ? (raw.urgency ?? c.moveInTimeline) : undefined) ??
    ''
  );
  if (!answerKey) return null;
  const verdict = def.optionVerdicts?.[answerKey];
  const displayAnswer = tOptionValue(answerKey);
  return verdict ? `${displayAnswer} — ${tVerdict(verdict)}` : displayAnswer;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadXRayDialog({ open, onClose, candidate, property, scoringConfig }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const cfg = scoringConfig;
  const thr = cfg.thresholds ?? { excellent: 70, potential: 45 };
  const numThr = cfg.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS;
  const levels = cfg.levelDefinitions?.length ? cfg.levelDefinitions : FALLBACK_LEVELS;
  const factorDefs = cfg.factorDefinitions?.length ? cfg.factorDefinitions : FALLBACK_FACTORS;
  const factorScores = candidate.factorScores ?? {};
  const factors = Object.keys(cfg.factors ?? {}).length ? cfg.factors : FALLBACK_FACTOR_LEVELS;

  // Group factor defs by category (preserve order)
  const categories = Array.from(
    factorDefs.reduce((m, f) => { if (!m.has(f.category)) m.set(f.category, f.categoryLabel); return m; }, new Map<string, string>())
  );

  // Compute weighted formula for display
  const levelWeightMap: Record<number, number> = Object.fromEntries(levels.map(l => [l.level, l.weight]));
  let totalWeight = 0;
  let weightedSum = 0;
  for (const def of factorDefs) {
    const level = factors[def.key] ?? 2;
    const w = levelWeightMap[level] ?? 2;
    const raw = factorScores[def.key] ?? 0;
    totalWeight += w;
    weightedSum += raw * w;
  }
  const computedScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : candidate.score;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            {t('dashboard:xray.title')} · {candidate.name}
            <span className="text-sm font-normal text-muted-foreground">score {candidate.score}/100</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Per-category factor breakdown */}
          {categories.map(([cat, catLabel]) => {
            const defs = factorDefs.filter(f => f.category === cat);
            return (
              <div key={cat} className="rounded-xl border p-4 space-y-4">
                <h3 className="text-sm font-semibold">{tCategory(catLabel)}</h3>
                {defs.map(def => {
                  const raw = factorScores[def.key] ?? 0;
                  const level = factors[def.key] ?? 2;
                  const w = levelWeightMap[level] ?? 2;
                  const note = factorNote(def.key, candidate, property, def, numThr, t);
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{tFactor(def.label)}</span>
                        <LevelBadge level={level} levels={levels} />
                      </div>
                      {note && (
                        <p className={`text-[11px] leading-snug ${
                          w === 0 ? 'text-muted-foreground/60 italic' :
                          raw < 35  ? 'text-destructive/80' :
                          raw < 60  ? 'text-amber-600 dark:text-amber-400' :
                          'text-muted-foreground'
                        }`}>{note}</p>
                      )}
                      {w === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">{t('dashboard:xray.ignored')}</p>
                      ) : (
                        <Bar value={raw} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Final score */}
          <div className="rounded-xl border p-4 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard:xray.finalScore')}</p>
            <p className="text-xs text-muted-foreground font-mono">
              Σ(score × peso) ÷ Σ(peso) ≈ <strong className="text-foreground">{computedScore}</strong>
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    candidate.score >= thr.excellent ? 'bg-emerald-500' :
                    candidate.score >= thr.potential ? 'bg-amber-400' :
                    'bg-muted-foreground/40'
                  }`}
                  style={{ width: `${candidate.score}%` }}
                />
              </div>
              <span className="text-sm font-bold font-mono w-8 text-right">{candidate.score}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('dashboard:xray.thresholds', { excellent: thr.excellent, potential: thr.potential })}
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

