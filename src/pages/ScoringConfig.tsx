import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { getScoringConfig, saveScoringConfig, DEFAULT_NUMERIC_THRESHOLDS } from '@/lib/leads-api';
import type { ScoringConfigDto, ScoringFactorLevelDto, ScoringFactorDefinitionDto, SaveScoringConfigInput } from '@/lib/leads-api';
import { tLevel, tCategory, tFactor } from '@/lib/scoring-i18n';

// ── Preset profiles ────────────────────────────────────────────────────────────

const PRESETS: { profileName: string; factors: Record<string, number> }[] = [
  {
    profileName: 'conservative',
    factors: { incomeRatio: 4, commitments: 3, jobType: 3, employmentDuration: 2, guarantor: 4, household: 2, pets: 2, urgency: 2, stayDuration: 2, hasVisited: 1, motivation: 1 },
  },
  {
    profileName: 'standard',
    factors: { incomeRatio: 4, commitments: 3, jobType: 2, employmentDuration: 2, guarantor: 3, household: 2, pets: 1, urgency: 2, stayDuration: 2, hasVisited: 1, motivation: 1 },
  },
  {
    profileName: 'flexible',
    factors: { incomeRatio: 3, commitments: 2, jobType: 2, employmentDuration: 1, guarantor: 1, household: 2, pets: 0, urgency: 3, stayDuration: 2, hasVisited: 2, motivation: 2 },
  },
];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-muted text-muted-foreground border-border',
  1: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  2: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  3: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  4: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
};

// Fallback definitions used when the seed collections haven't been populated yet
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
  { key: 'jobType',            category: 'employment',  categoryLabel: 'Employment',  label: 'Employment Type',            order: 3,  optionVerdicts: {} },
  { key: 'employmentDuration', category: 'employment',  categoryLabel: 'Employment',  label: 'Employment Duration',        order: 4,  optionVerdicts: {} },
  { key: 'guarantor',          category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Guarantor',                  order: 5,  optionVerdicts: {} },
  { key: 'household',          category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Household Composition',      order: 6,  optionVerdicts: {} },
  { key: 'pets',               category: 'guarantees',  categoryLabel: 'Guarantees',  label: 'Pets',                       order: 7,  optionVerdicts: {} },
  { key: 'urgency',            category: 'intention',   categoryLabel: 'Intention',   label: 'Move-in Urgency',            order: 8,  optionVerdicts: {} },
  { key: 'stayDuration',       category: 'intention',   categoryLabel: 'Intention',   label: 'Intended Stay Duration',     order: 9,  optionVerdicts: {} },
  { key: 'hasVisited',         category: 'intention',   categoryLabel: 'Intention',   label: 'Has Visited Properties',     order: 10, optionVerdicts: {} },
  { key: 'motivation',         category: 'intention',   categoryLabel: 'Intention',   label: 'Motivation to Move',         order: 11, optionVerdicts: {} },
];

// ── Level selector component ──────────────────────────────────────────────────

function LevelSelector({
  value,
  levels,
  onChange,
  t,
}: {
  value: number;
  levels: ScoringFactorLevelDto[];
  onChange: (v: number) => void;
  t: TFunction;
}) {
  return (
    <div className="flex gap-1">
      {levels.map(l => (
        <button
          key={l.level}
          type="button"
          onClick={() => onChange(l.level)}
          title={tLevel(l.label)}
          className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${
            value === l.level
              ? LEVEL_COLORS[l.level]
              : 'bg-transparent text-muted-foreground/50 border-border/40 hover:border-border hover:text-muted-foreground'
          }`}
        >
          {tLevel(l.label)}
        </button>
      ))}
    </div>
  );
}

// ── Factor row ────────────────────────────────────────────────────────────────

function FactorRow({
  def,
  level,
  levels,
  onChange,
  t,
}: {
  def: ScoringFactorDefinitionDto;
  level: number;
  levels: ScoringFactorLevelDto[];
  onChange: (v: number) => void;
  t: TFunction;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{tFactor(def.label)}</span>
      </div>
      <LevelSelector value={level} levels={levels} onChange={onChange} t={t} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoringConfig() {
  const { currentAgencyId } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('settings');

  const [config, setConfig] = useState<Omit<ScoringConfigDto, 'agencyId'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Raw string state for numeric threshold inputs — avoids NaN-on-clear problem.
  const [rawNt, setRawNt] = useState<{ ir: string[]; cp: string[] }>(
    { ir: ['1', '2', '3', '3.5'], cp: ['20', '40', '60'] }
  );

  useEffect(() => {
    if (!currentAgencyId) return;
    getScoringConfig(currentAgencyId)
      .then(dto => {
        const { agencyId: _, ...rest } = dto;
        setConfig(rest);
        const nt = rest.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS;
        setRawNt({
          ir: (nt.incomeRatio        ?? [1.0, 2.0, 3.0, 3.5]).map(String),
          cp: (nt.commitmentsPercent ?? [20, 40, 60]).map(String),
        });
      })
      .catch(() => toast({ title: t('scoring.errorLoad'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [currentAgencyId]);

  function commitNumericThreshold(field: 'incomeRatio' | 'commitmentsPercent', rawKey: 'ir' | 'cp', index: number, raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) {
      setNumericThreshold(field, index, n);
    } else {
      // Revert raw display to current config value if invalid
      const current = config?.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS;
      const arr = (field === 'incomeRatio' ? current.incomeRatio : current.commitmentsPercent) ?? [];
      setRawNt(prev => {
        const updated = [...prev[rawKey]];
        updated[index] = String(arr[index] ?? '');
        return { ...prev, [rawKey]: updated };
      });
    }
  }

  if (loading || !config) return (
    <DashboardLayout>
      <div className="p-8 text-muted-foreground text-sm">{t('scoring.loading')}</div>
    </DashboardLayout>
  );

  const levels = config.levelDefinitions?.length ? config.levelDefinitions : FALLBACK_LEVELS;
  const factorDefs = config.factorDefinitions?.length ? config.factorDefinitions : FALLBACK_FACTORS;

  // Group factors by category
  const categories = Array.from(new Set(factorDefs.map(f => f.category)));
  const byCategory = (cat: string) => factorDefs.filter(f => f.category === cat);
  const categoryLabel = (cat: string) => factorDefs.find(f => f.category === cat)?.categoryLabel ?? cat;

  function setFactor(key: string, level: number) {
    setConfig(prev => prev ? { ...prev, factors: { ...prev.factors, [key]: level } } : prev);
  }

  function setNumericThreshold(field: 'incomeRatio' | 'commitmentsPercent', index: number, value: number) {
    setConfig(prev => {
      if (!prev) return prev;
      const current = prev.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS;
      const updated = [...(current[field] ?? [])];
      updated[index] = value;
      return { ...prev, numericThresholds: { ...current, [field]: updated } };
    });
  }

  function applyPreset(preset: typeof PRESETS[number]) {
    setConfig(prev => prev ? { ...prev, profileName: preset.profileName, factors: { ...prev.factors, ...preset.factors } } : prev);
  }

  async function handleSave() {
    if (!currentAgencyId || !config) return;
    setSaving(true);
    try {
      const input: SaveScoringConfigInput = {
        profileName:       config.profileName,
        thresholds:        config.thresholds,
        numericThresholds: config.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS,
        factors:           config.factors,
      };
      const dto = await saveScoringConfig(currentAgencyId, input);
      const { agencyId: _, ...rest } = dto;
      setConfig(rest);
      toast({ title: t('scoring.saved') });
    } catch (err) {
      monitoring.captureException(err, { context: 'save-scoring-config' });
      toast({ title: t('scoring.errorSave'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold font-display">{t('scoring.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('scoring.subtitle')}
          </p>
        </motion.div>

        {/* Presets */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border p-5 bg-card space-y-4">
          <h2 className="font-semibold text-sm">{t('scoring.presetTitle')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map(p => (
              <button key={p.profileName} type="button" onClick={() => applyPreset(p)}
                className={`rounded-lg border p-3 text-left text-sm transition-all ${
                  config.profileName === p.profileName
                    ? 'border-primary bg-primary/5 text-foreground font-medium'
                    : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-semibold">{t(`scoring.profiles.${p.profileName}`)}</div>
                <div className="text-[11px] mt-0.5 opacity-60">
                  {t(`scoring.profileDesc.${p.profileName}`)}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t('scoring.presetHint')}
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-xl border p-4 bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('scoring.legend')}</p>
          <div className="flex flex-wrap gap-2">
            {levels.map(l => (
              <span key={l.level} className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${LEVEL_COLORS[l.level]}`}>
                {tLevel(l.label)}
                <span className="ml-1.5 opacity-60 font-normal">
                  {l.level === 0 ? t('scoring.legendExcluded') :
                   l.level === 4 ? t('scoring.legendCritical') :
                   t('scoring.legendWeight', { weight: l.weight })}
                </span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* Factors by category */}
        {categories.map((cat, ci) => (
          <motion.div key={cat}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + ci * 0.04 }}
            className="rounded-xl border p-5 bg-card">
            <h2 className="font-semibold text-sm mb-1">{tCategory(categoryLabel(cat))}</h2>
            <div>
              {byCategory(cat).map(def => (
                <FactorRow
                  key={def.key}
                  def={def}
                  level={config.factors[def.key] ?? 2}
                  levels={levels}
                  onChange={v => setFactor(def.key, v)}
                  t={t}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Classification thresholds */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border p-5 bg-card space-y-4">
          <div>
            <h2 className="font-semibold text-sm">{t('scoring.classificationTitle')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('scoring.classificationSubtitle', { excellent: config.thresholds.excellent, potential: config.thresholds.potential })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {t('scoring.excellentLabel')}
              </Label>
              <Input
                inputMode="numeric"
                value={config.thresholds.excellent === 0 ? '' : String(config.thresholds.excellent)}
                onChange={e => {
                  if (e.target.value === '') { setConfig(p => p ? { ...p, thresholds: { ...p.thresholds, excellent: 0 } } : p); return; }
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setConfig(p => p ? { ...p, thresholds: { ...p.thresholds, excellent: v } } : p);
                }}
                className="h-9 rounded-lg font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {t('scoring.potentialLabel')}
              </Label>
              <Input
                inputMode="numeric"
                value={config.thresholds.potential === 0 ? '' : String(config.thresholds.potential)}
                onChange={e => {
                  if (e.target.value === '') { setConfig(p => p ? { ...p, thresholds: { ...p.thresholds, potential: 0 } } : p); return; }
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setConfig(p => p ? { ...p, thresholds: { ...p.thresholds, potential: v } } : p);
                }}
                className="h-9 rounded-lg font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t('scoring.classificationNote', { potential: config.thresholds.potential, excellent: config.thresholds.excellent })}
          </p>
        </motion.div>

        {/* Numeric factor thresholds */}
        {(() => {
          const nt = config.numericThresholds ?? DEFAULT_NUMERIC_THRESHOLDS;
          const ir = nt.incomeRatio ?? [1.0, 2.0, 3.0, 3.5];
          const cp = nt.commitmentsPercent ?? [20, 40, 60];
          const irLabels = [t('scoring.irMin'), t('scoring.irWeak'), t('scoring.irGood'), t('scoring.irIdeal')];
          const cpLabels = [t('scoring.cpMaxLow'), t('scoring.cpMaxMid'), t('scoring.cpMaxHigh')];
          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
              className="rounded-xl border p-5 bg-card space-y-4">
              <div>
                <h2 className="font-semibold text-sm">{t('scoring.numericTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('scoring.numericSubtitle')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">{t('scoring.incomeRatioTitle')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {ir.map((v, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground capitalize">{irLabels[i] ?? `t${i}`}</Label>
                      <Input
                        inputMode="decimal"
                        value={rawNt.ir[i] ?? String(v)}
                        onChange={e => setRawNt(prev => {
                          const updated = [...prev.ir];
                          updated[i] = e.target.value;
                          return { ...prev, ir: updated };
                        })}
                        onBlur={e => commitNumericThreshold('incomeRatio', 'ir', i, e.target.value)}
                        className="h-8 rounded-lg font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('scoring.incomeRatioNote', { ir0: ir[0], ir1: ir[1], ir2: ir[2], ir3: ir[3] })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">{t('scoring.commitmentsTitle')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {cp.map((v, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{cpLabels[i] ?? `t${i}`}</Label>
                      <Input
                        inputMode="numeric"
                        value={rawNt.cp[i] ?? String(v)}
                        onChange={e => setRawNt(prev => {
                          const updated = [...prev.cp];
                          updated[i] = e.target.value;
                          return { ...prev, cp: updated };
                        })}
                        onBlur={e => commitNumericThreshold('commitmentsPercent', 'cp', i, e.target.value)}
                        className="h-8 rounded-lg font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('scoring.commitmentsNote', { cp0: cp[0], cp1: cp[1], cp2: cp[2] })}
                </p>
              </div>
            </motion.div>
          );
        })()
        }

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => applyPreset(PRESETS[0])}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {t('scoring.reset')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? t('scoring.saving') : t('scoring.save')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
