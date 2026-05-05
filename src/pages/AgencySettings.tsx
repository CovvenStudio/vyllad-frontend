import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, Clock, Users, Calendar, CalendarDays, Loader2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSchedulingConfig,
  updateSchedulingConfig,
  type SchedulingPeriodDto,
  type SchedulingConfigDto,
} from '@/lib/settings-api';

// ─── Time Picker ─────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':');
  return (
    <div className="flex items-center gap-1">
      <Select value={h} onValueChange={v => onChange(`${v}:${m}`)}>
        <SelectTrigger className="h-9 w-[72px] rounded-xl text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {HOURS.map(hour => (
            <SelectItem key={hour} value={hour}>{hour}h</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm font-medium">:</span>
      <Select value={m} onValueChange={v => onChange(`${h}:${v}`)}>
        <SelectTrigger className="h-9 w-[68px] rounded-xl text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(min => (
            <SelectItem key={min} value={min}>{min}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencySettings() {
  const { currentAgencyId } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['settings', 'common']);

  const [config, setConfig] = useState<SchedulingConfigDto>({
    periods: [
      { label: 'Manhã', start: '09:00', end: '12:00' },
      { label: 'Início da tarde', start: '14:00', end: '16:00' },
      { label: 'Final do dia', start: '16:00', end: '18:00' },
    ],
    availableWeekdays: [1, 2, 3, 4, 5],
    maxClientChoices: 3,
    agentSlotIntervalMinutes: 30,
    maxVisitsPerTime: 1,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maxClientChoicesDraft, setMaxClientChoicesDraft] = useState('3');
  const [maxVisitsPerTimeDraft, setMaxVisitsPerTimeDraft] = useState('1');

  const commitMaxClientChoices = useCallback(() => {
    const parsed = Number(maxClientChoicesDraft);
    const next = Number.isFinite(parsed) ? Math.min(5, Math.max(1, parsed)) : config.maxClientChoices;
    setConfig(c => ({ ...c, maxClientChoices: next }));
    setMaxClientChoicesDraft(String(next));
  }, [maxClientChoicesDraft, config.maxClientChoices]);

  const commitMaxVisitsPerTime = useCallback(() => {
    const parsed = Number(maxVisitsPerTimeDraft);
    const next = Number.isFinite(parsed) ? Math.min(20, Math.max(1, parsed)) : config.maxVisitsPerTime;
    setConfig(c => ({ ...c, maxVisitsPerTime: next }));
    setMaxVisitsPerTimeDraft(String(next));
  }, [maxVisitsPerTimeDraft, config.maxVisitsPerTime]);

  const load = useCallback(async () => {
    if (!currentAgencyId) return;
    setLoading(true);
    try {
      const data = await getSchedulingConfig(currentAgencyId);
      setConfig(data);
      setMaxClientChoicesDraft(String(data.maxClientChoices));
      setMaxVisitsPerTimeDraft(String(data.maxVisitsPerTime));
    } catch (err) {
      monitoring.captureException(err, { context: 'load-scheduling-config' });
      // use defaults
    } finally {
      setLoading(false);
    }
  }, [currentAgencyId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!currentAgencyId) return;
    setSaving(true);
    try {
      commitMaxClientChoices();
      commitMaxVisitsPerTime();

      const updated = await updateSchedulingConfig(currentAgencyId, config);
      setConfig(updated);
      setMaxClientChoicesDraft(String(updated.maxClientChoices));
      setMaxVisitsPerTimeDraft(String(updated.maxVisitsPerTime));
      toast({ title: t('settings:agency.saved'), description: t('settings:agency.savedDesc') });
    } catch (err) {
      monitoring.captureException(err, { context: 'save-scheduling-config' });
      toast({ title: t('settings:agency.error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updatePeriod = (i: number, field: keyof SchedulingPeriodDto, value: string) => {
    setConfig(c => ({
      ...c,
      periods: c.periods.map((p, idx) => idx === i ? { ...p, [field]: value } : p),
    }));
  };

  const addPeriod = () => {
    setConfig(c => ({
      ...c,
      periods: [...c.periods, { label: t('settings:agency.newPeriod'), start: '08:00', end: '10:00' }],
    }));
  };

  const removePeriod = (i: number) => {
    setConfig(c => ({ ...c, periods: c.periods.filter((_, idx) => idx !== i) }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-700 text-2xl tracking-tight">{t('settings:agency.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings:agency.subtitle')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Periods */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{t('settings:agency.periodsTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('settings:agency.periodsSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-3">
              {config.periods.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">{t('settings:agency.fieldName')}</Label>
                      <Input
                        value={p.label}
                        onChange={e => updatePeriod(i, 'label', e.target.value)}
                        className="h-9 text-sm rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">{t('settings:agency.fieldStart')}</Label>
                      <TimePicker value={p.start} onChange={v => updatePeriod(i, 'start', v)} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">{t('settings:agency.fieldEnd')}</Label>
                      <TimePicker value={p.end} onChange={v => updatePeriod(i, 'end', v)} />
                    </div>
                  </div>
                  <button
                    onClick={() => removePeriod(i)}
                    disabled={config.periods.length <= 1}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addPeriod}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t('settings:agency.addPeriod')}
            </button>
          </motion.div>

          {/* Weekdays */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-2xl border bg-card p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <Label className="font-semibold text-sm block mb-0.5">{t('settings:agency.weekdaysTitle')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings:agency.weekdaysSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {([t('common:days.sun'), t('common:days.mon'), t('common:days.tue'), t('common:days.wed'), t('common:days.thu'), t('common:days.fri'), t('common:days.sat')] as const).map((label, dow) => {
                const active = (config.availableWeekdays ?? [1,2,3,4,5]).includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() =>
                      setConfig(c => ({
                        ...c,
                        availableWeekdays: active
                          ? (c.availableWeekdays ?? [1,2,3,4,5]).filter(d => d !== dow)
                          : [...(c.availableWeekdays ?? [1,2,3,4,5]), dow].sort((a,b) => a-b),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Choices + Interval */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border bg-card p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold">{t('settings:agency.capacityTitle')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings:agency.capacitySubtitle')}
                </p>
              </div>
              <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {t('settings:agency.globalConfig')}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {t('settings:agency.maxChoicesBadge', { count: config.maxClientChoices })}
                  </span>
                </div>
                <Label className="font-semibold text-sm block mb-1">{t('settings:agency.maxChoicesTitle')}</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('settings:agency.maxChoicesSubtitle')}
                </p>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={maxClientChoicesDraft}
                  onChange={e => setMaxClientChoicesDraft(e.target.value)}
                  onBlur={commitMaxClientChoices}
                  className="h-9 w-full max-w-[140px] rounded-xl"
                />
              </div>

              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {config.agentSlotIntervalMinutes} min
                  </span>
                </div>
                <Label className="font-semibold text-sm block mb-1">{t('settings:agency.intervalTitle')}</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('settings:agency.intervalSubtitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 90].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, agentSlotIntervalMinutes: v }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        config.agentSlotIntervalMinutes === v
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {v} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {t('settings:agency.maxVisitsBadge', { count: config.maxVisitsPerTime })}
                  </span>
                </div>
                <Label className="font-semibold text-sm block mb-1">{t('settings:agency.maxVisitsTitle')}</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('settings:agency.maxVisitsSubtitle')}
                </p>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={maxVisitsPerTimeDraft}
                  onChange={e => setMaxVisitsPerTimeDraft(e.target.value)}
                  onBlur={commitMaxVisitsPerTime}
                  className="h-9 w-full max-w-[140px] rounded-xl"
                />
              </div>
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border bg-muted/30 p-5"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('settings:agency.previewTitle')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {config.periods.map((p, i) => (
                <div key={i} className="px-4 py-2.5 rounded-xl border bg-card text-sm font-medium">
                  {p.label}
                  <span className="text-xs text-muted-foreground ml-2">{p.start} – {p.end}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-6 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('settings:agency.saveButton')}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
