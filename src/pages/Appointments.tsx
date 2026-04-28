import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Clock, MapPin, User, Filter,
  X, CalendarCheck, UserCheck, Plus, ChevronRight, ChevronLeft, Link2, Check, Loader2,
  RotateCcw, Ban, Send, CheckCircle2, Trophy,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useProperties } from '@/hooks/useProperties';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { listLeadsByAgency, sendVisitLink, contractLead } from '@/lib/leads-api';
import type { LeadDto } from '@/lib/leads-api';
import type { AgentDto } from '@/lib/agents-api';
import type { PropertyDto } from '@/lib/properties-api';
import type { AppointmentDto } from '@/lib/appointments-api';
import {
  cancelAppointmentPublic,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  listBlockedVisitSlots,
  blockVisitSlot,
  unblockVisitSlot,
} from '@/lib/appointments-api';
import { getSchedulingConfig } from '@/lib/settings-api';
import type { SchedulingConfigDto } from '@/lib/settings-api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  value,
  onChange,
  minDate,
  availableWeekdays,
}: {
  value: string;
  onChange: (v: string) => void;
  minDate?: string;
  availableWeekdays?: number[];
}) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const initial = value ? new Date(value + 'T00:00') : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const toStr = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
    i < firstDow ? null : i - firstDow + 1
  );

  return (
    <div className="rounded-2xl border bg-card">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold tracking-tight">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-3 py-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const ds = toStr(d);
            const isPast = minDate ? ds < minDate : false;
            const isDayOff = availableWeekdays != null && !availableWeekdays.includes(new Date(ds + 'T00:00').getDay());
            const isDisabled = isPast || isDayOff;
            const isToday = ds === todayStr;
            const isSelected = ds === value;
            return (
              <button
                key={ds}
                type="button"
                disabled={isDisabled}
                onClick={() => onChange(ds)}
                className={[
                  'h-9 w-full rounded-xl text-sm font-medium transition-all duration-150 select-none',
                  isDisabled
                    ? 'text-muted-foreground/30 cursor-not-allowed line-through decoration-muted-foreground/20'
                    : 'hover:bg-primary/8 cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold hover:bg-primary/90'
                    : isToday && !isDisabled
                    ? 'ring-1.5 ring-primary text-primary font-semibold'
                    : '',
                ].join(' ')}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date summary */}
      {value && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-primary/[0.06] border border-primary/10 flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-primary">
            {new Date(value + 'T00:00').toLocaleDateString('pt-PT', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}

const statusConfig = {
  confirmed: { label: 'Confirmada', className: 'bg-accent/10 text-accent' },
  completed: { label: 'Concluída', className: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive' },
};

// ─── Schedule Modal ───────────────────────────────────────────────────────────

interface ScheduleModalProps {
  agencyId: string;
  lead: LeadDto;
  property: PropertyDto | undefined;
  agents: AgentDto[];
  schedulingConfig: SchedulingConfigDto | null;
  confirmedAppointments: AppointmentDto[];
  onClose: () => void;
  onConfirm: (input: { propertyId: string; leadId: string; agentId: string; date: string; time: string; notes?: string }) => Promise<void>;
}

/** Generate HH:MM sub-slots within [start, end) at intervalMinutes. */
function generateSubSlots(start: string, end: string, intervalMinutes: number): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins   = eh * 60 + em;
  const slots: string[] = [];
  for (let m = startMins; m < endMins; m += intervalMinutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

const ScheduleModal = ({ agencyId, lead, property, agents, schedulingConfig, confirmedAppointments, onClose, onConfirm }: ScheduleModalProps) => {
  const { toast } = useToast();
  const proposedSlots = lead.proposedSlots ?? [];
  const hasSuggestions = proposedSlots.length > 0;

  // Default: first proposed slot's date, or today
  const defaultDate = proposedSlots[0]?.date ?? new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');

  // property.agentIds stores membership IDs (a.id), not userIds
  const matchedAgent = property?.agentIds?.length
    ? agents.find(a => property.agentIds.includes(a.id))
    : undefined;
  const defaultAgentId = (matchedAgent ?? agents[0])?.userId ?? (matchedAgent ?? agents[0])?.id ?? '';
  const [agentId, setAgentId] = useState(defaultAgentId);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<Set<string>>(new Set());
  const [loadingBlockedTimes, setLoadingBlockedTimes] = useState(false);
  const [togglingBlockedTime, setTogglingBlockedTime] = useState<string | null>(null);

  // When user picks a proposed slot, jump to that date and surface sub-slots for that period
  const handlePickSuggestion = (slot: { date: string; periodLabel: string }) => {
    setDate(slot.date);
    setTime(''); // let agent pick sub-slot
  };

  // Determine which sub-slots to show for the selected date
  const activePeriod = useMemo(() => {
    const suggestion = proposedSlots.find(s => s.date === date);
    if (!suggestion || !schedulingConfig) return null;
    return schedulingConfig.periods.find(p => p.label === suggestion.periodLabel) ?? null;
  }, [date, proposedSlots, schedulingConfig]);

  const timeSlots = useMemo(() => {
    let raw: string[];
    if (!schedulingConfig) {
      raw = TIME_SLOTS;
    } else if (activePeriod) {
      raw = generateSubSlots(activePeriod.start, activePeriod.end, schedulingConfig.agentSlotIntervalMinutes);
    } else {
      const allSlots: string[] = [];
      for (const p of schedulingConfig.periods) {
        allSlots.push(...generateSubSlots(p.start, p.end, schedulingConfig.agentSlotIntervalMinutes));
      }
      raw = allSlots.length ? allSlots : TIME_SLOTS;
    }
    const now = new Date();
    const today = toLocalDateString(now);
    if (date !== today) return raw;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return raw.filter((slot) => toMinutes(slot) > nowMinutes);
  }, [activePeriod, schedulingConfig, date]);

  const maxVisitsPerTime = Math.max(schedulingConfig?.maxVisitsPerTime ?? 1, 1);

  const occupancyByTime = useMemo(() => {
    const occupancyByTime = new Map<string, number>();

    for (const appointment of confirmedAppointments) {
      if (appointment.propertyId !== lead.propertyId) continue;
      if (appointment.date !== date) continue;
      if (appointment.status !== 'confirmed') continue;

      occupancyByTime.set(appointment.time, (occupancyByTime.get(appointment.time) ?? 0) + 1);
    }

    return occupancyByTime;
  }, [confirmedAppointments, date, lead.propertyId]);

  const availableSlots = useMemo(() => {
    return timeSlots.filter((slot) => {
      if (blockedTimes.has(slot)) return false;
      return (occupancyByTime.get(slot) ?? 0) < maxVisitsPerTime;
    });
  }, [timeSlots, blockedTimes, occupancyByTime, maxVisitsPerTime]);

  useEffect(() => {
    if (!agencyId || !lead.propertyId || !date) {
      setBlockedTimes(new Set());
      return;
    }

    let mounted = true;
    setLoadingBlockedTimes(true);

    listBlockedVisitSlots(agencyId, lead.propertyId, date)
      .then((items) => {
        if (!mounted) return;
        setBlockedTimes(new Set(items.map((item) => item.time)));
      })
      .catch(() => {
        if (!mounted) return;
        setBlockedTimes(new Set());
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingBlockedTimes(false);
      });

    return () => {
      mounted = false;
    };
  }, [agencyId, lead.propertyId, date]);

  useEffect(() => {
    if (!time) return;
    if (!availableSlots.includes(time)) setTime('');
  }, [availableSlots, time]);

  const handleToggleBlockedTime = async (slot: string) => {
    if (!agencyId || !lead.propertyId) return;

    setTogglingBlockedTime(slot);
    try {
      if (blockedTimes.has(slot)) {
        await unblockVisitSlot(agencyId, lead.propertyId, date, slot);
        setBlockedTimes((prev) => {
          const next = new Set(prev);
          next.delete(slot);
          return next;
        });
        toast({ title: `Horário ${slot} desbloqueado` });
      } else {
        await blockVisitSlot(agencyId, lead.propertyId, { date, time: slot });
        setBlockedTimes((prev) => {
          const next = new Set(prev);
          next.add(slot);
          return next;
        });
        if (time === slot) setTime('');
        toast({ title: `Horário ${slot} bloqueado` });
      }
    } catch {
      toast({ title: 'Não foi possível atualizar o bloqueio', variant: 'destructive' });
    } finally {
      setTogglingBlockedTime(null);
    }
  };

  const canSubmit = date && time && agentId && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        propertyId: lead.propertyId,
        leadId:     lead.id,
        agentId,
        date,
        time,
        notes: notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ds: string) =>
    new Date(ds + 'T00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border pointer-events-auto flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header — fixo */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
            <div>
              <h2 className="font-display font-700 text-lg tracking-tight">Agendar visita</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lead.name} · {property?.title ?? '—'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body — scrollável */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Lead proposed slots */}
            {hasSuggestions && (
              <div>
                <Label className="text-xs font-medium mb-2 block">
                  Preferências do candidato
                  <span className="text-muted-foreground font-normal ml-1">(clica para usar)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {proposedSlots.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePickSuggestion(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        date === s.date
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <CalendarCheck className="w-3 h-3" />
                      {formatDate(s.date)} · {s.periodLabel}
                    </button>
                  ))}
                </div>
                {activePeriod && (
                  <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Mostrando horários do período "{activePeriod.label}" ({activePeriod.start}–{activePeriod.end})
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Data da visita</Label>
              <MiniCalendar
                value={date}
                onChange={d => { setDate(d); setTime(''); }}
                minDate={toLocalDateString(new Date())}
                availableWeekdays={schedulingConfig?.availableWeekdays}
              />
            </div>

            {/* Agent sub-slots */}
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Horário
                {activePeriod && (
                  <span className="text-muted-foreground font-normal ml-1">
                    — {activePeriod.label}
                  </span>
                )}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      time === t
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {availableSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-4">
                    Não há horários disponíveis para esta data/período.
                  </p>
                )}
              </div>
            </div>

            {/* Manual block/unblock */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Bloqueio manual por horário</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Use quando quiser fechar um horário antes de atingir o limite de visitas.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot) => {
                  const isBlocked = blockedTimes.has(slot);
                  const isBusy = togglingBlockedTime === slot;
                  const occupancy = occupancyByTime.get(slot) ?? 0;
                  return (
                    <button
                      key={`block-${slot}`}
                      type="button"
                      onClick={() => handleToggleBlockedTime(slot)}
                      disabled={isBusy || loadingBlockedTimes}
                      className={`px-2.5 py-2 rounded-lg border text-xs transition-all ${
                        isBlocked
                          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-semibold">{slot}</div>
                      <div className="text-[10px] opacity-80">
                        {isBusy
                          ? 'A atualizar...'
                          : isBlocked
                            ? 'Bloqueado'
                            : `Ocupação ${occupancy}/${maxVisitsPerTime}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agent */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Agente responsável</Label>
              <Select value={agentId} onValueChange={v => { setAgentId(v); setTime(''); }}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.userId ?? a.id} value={a.userId ?? a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                placeholder="Ex: trazer documentos de rendimento, visita guiada ao exterior…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="rounded-xl resize-none text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* Footer — fixo */}
          <div className="shrink-0 px-6 pb-5 pt-4 border-t flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="flex-1 rounded-xl font-semibold"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : <CalendarCheck className="w-4 h-4 mr-1.5" />}
              Agendar visita
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)  return `há ${mins}min`;
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

// ─── Pending Card ─────────────────────────────────────────────────────────────

const PendingCard = ({
  lead,
  property,
  onSchedule,
  onLinkSent,
}: {
  lead: LeadDto;
  property: PropertyDto | undefined;
  onSchedule: () => void;
  onLinkSent?: () => void;
}) => {
  const proposedVisit: string | undefined = (lead as LeadDto & { proposedVisit?: string }).proposedVisit;
  const hasProposed = !!proposedVisit;
  const { toast } = useToast();
  const { currentAgencyId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const handleSendLink = async () => {
    if (!currentAgencyId) return;
    setSendingLink(true);
    try {
      await sendVisitLink(currentAgencyId, lead.id);
      toast({ title: 'Email enviado!', description: `Link de visita enviado para ${lead.name.split(' ')[0]}.` });
      onLinkSent?.();
    } catch {
      toast({ title: 'Erro ao enviar email', variant: 'destructive' });
    } finally {
      setSendingLink(false);
    }
  };

  const handleCopyLink = () => {
    const token = lead.visitToken ?? '';
    const url = `${window.location.origin}/visit/${lead.id}${token ? `?token=${token}` : ''}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    if (!token) {
      toast({ title: 'Atenção', description: 'Este candidato ainda não tem token de visita. Aprova-o primeiro.', variant: 'destructive' });
    } else {
      toast({ title: 'Link copiado!', description: `Partilhe com ${lead.name.split(' ')[0]}.` });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-all">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <UserCheck className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm">{lead.name}</span>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {lead.score}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{property?.title ?? '—'}</p>
        {hasProposed && (
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" />
            Propõe {new Date(proposedVisit!).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} às{' '}
            {new Date(proposedVisit!).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {(lead.proposedSlots?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CalendarCheck className="w-2.5 h-2.5" />
              Preferências do candidato recebidas
            </span>
          )}
          {lead.visitLinkSentAt && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Send className="w-2.5 h-2.5" />
              Link enviado {formatRelativeTime(lead.visitLinkSentAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSendLink}
          disabled={sendingLink || !lead.visitToken}
          title="Enviar link de visita por email"
          className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {sendingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Enviar</span>
        </button>
        <button
          onClick={handleCopyLink}
          title="Copiar link de agendamento"
          className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
              : 'border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copiado' : 'Link'}</span>
        </button>
        <Button
          size="sm"
          variant={hasProposed ? 'default' : 'outline'}
          onClick={onSchedule}
          className="rounded-lg shrink-0 gap-1.5 text-xs"
        >
          {hasProposed ? (
            <><CalendarCheck className="w-3.5 h-3.5" /> Confirmar</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Agendar</>
          )}
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// ─── Cancelled Card ───────────────────────────────────────────────────────────

const CancelledCard = ({
  lead,
  property,
  onSchedule,
  onLinkSent,
}: {
  lead: LeadDto;
  property: PropertyDto | undefined;
  onSchedule: () => void;
  onLinkSent?: () => void;
}) => {
  const hasProposed = (lead.proposedSlots?.length ?? 0) > 0;
  const { toast } = useToast();
  const { currentAgencyId } = useAuth();
  const [sendingLink, setSendingLink] = useState(false);

  const handleSendLink = async () => {
    if (!currentAgencyId) return;
    setSendingLink(true);
    try {
      await sendVisitLink(currentAgencyId, lead.id);
      toast({ title: 'Email enviado!', description: `Novo link de visita enviado para ${lead.name.split(' ')[0]}.` });
      onLinkSent?.();
    } catch {
      toast({ title: 'Erro ao enviar email', variant: 'destructive' });
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:shadow-sm transition-all">
      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <RotateCcw className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm">{lead.name}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Visita cancelada
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{property?.title ?? '—'}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {hasProposed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CalendarCheck className="w-2.5 h-2.5" />
              Preferências do candidato recebidas
            </span>
          )}
          {lead.visitLinkSentAt && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Send className="w-2.5 h-2.5" />
              Link enviado {formatRelativeTime(lead.visitLinkSentAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSendLink}
          disabled={sendingLink || !lead.visitToken}
          title="Enviar novo link de visita"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {sendingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Enviar link</span>
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSchedule}
          className="rounded-lg shrink-0 gap-1.5 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reagendar
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// ─── Stat ─────────────────────────────────────────────────────────────────────

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="p-5 rounded-xl border bg-card">
    <div className="text-2xl font-display font-700 tracking-tight">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

// ─── Section ──────────────────────────────────────────────────────────────────

type EnrichedAppointment = AppointmentDto & {
  property: PropertyDto | undefined;
  lead: LeadDto | undefined;
  agent: AgentDto | undefined;
};

const Section = ({
  title,
  items,
  muted,
  onCancel,
  onReschedule,
  onComplete,
  onContract,
}: {
  title: string;
  items: EnrichedAppointment[];
  muted?: boolean;
  onCancel?: (apt: EnrichedAppointment) => void;
  onReschedule?: (apt: EnrichedAppointment) => void;
  onComplete?: (apt: EnrichedAppointment) => void;
  onContract?: (apt: EnrichedAppointment) => void;
}) => (
  <div className={muted ? 'mt-10 opacity-70' : 'mb-10'}>
    <h2 className="font-display font-600 text-sm mb-4">{title}</h2>
    {items.length === 0 ? (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        <CalendarIcon className="w-7 h-7 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Sem agendamentos</p>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((apt, i) => {
          const st = statusConfig[apt.status];
          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl border bg-card hover:shadow-md transition-all duration-300 flex items-center gap-5"
            >
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-primary/[0.04] shrink-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {new Date(apt.date + 'T00:00').toLocaleDateString('pt-PT', { month: 'short' })}
                </span>
                <span className="font-display font-700 text-xl leading-none">
                  {new Date(apt.date + 'T00:00').getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {apt.lead && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-base truncate">{apt.lead.name}</span>
                    {st && (
                      <Badge variant="secondary" className={`${st.className} text-[11px] font-medium shrink-0`}>
                        {st.label}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{apt.property?.title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {apt.time}</span>
                  {apt.property?.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {apt.property.location}</span>
                  )}
                </div>
                {apt.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{apt.notes}</p>
                )}
              </div>
              {apt.agent && (
                <div className="hidden sm:flex items-center gap-2 pl-4 border-l shrink-0">
                  {apt.agent.avatarUrl
                    ? <img src={apt.agent.avatarUrl} alt={apt.agent.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full bg-muted object-cover" onError={e => { e.currentTarget.style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement|null)?.style.setProperty('display','flex'); }} />
                    : null}
                  <div className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center text-xs font-semibold text-primary" style={{ display: apt.agent.avatarUrl ? 'none' : 'flex' }}>{apt.agent.name[0]}</div>
                  <div className="text-xs">
                    <div className="font-medium truncate max-w-[120px]">{apt.agent.name}</div>
                    <div className="text-muted-foreground text-[10px]">Agente</div>
                  </div>
                </div>
              )}
              {/* Action buttons */}
              {(apt.status === 'confirmed' || apt.status === 'completed') && (
                <div className="flex items-center gap-2 shrink-0 pl-2 border-l">
                  {/* Confirmed: Finalizar + Reagendar + Cancelar */}
                  {apt.status === 'confirmed' && onComplete && (
                    <button
                      onClick={() => onComplete(apt)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Finalizar</span>
                    </button>
                  )}
                  {apt.status === 'confirmed' && onReschedule && (
                    <button
                      onClick={() => onReschedule(apt)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Reagendar</span>
                    </button>
                  )}
                  {apt.status === 'confirmed' && onCancel && (
                    <button
                      onClick={() => onCancel(apt)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all font-medium"
                    >
                      <Ban className="w-3.5 h-3.5 shrink-0" />
                      <span>Cancelar</span>
                    </button>
                  )}
                  {/* Completed: Fechar contrato (only if lead not yet contracted) */}
                  {apt.status === 'completed' && onContract && apt.lead?.status !== 'contracted' && apt.lead?.status === 'visit_finished' && (
                    <button
                      onClick={() => onContract(apt)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-violet-700 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all font-medium"
                    >
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                      <span>Fechar contrato</span>
                    </button>
                  )}
                  {apt.status === 'completed' && apt.lead?.status === 'contracted' && (
                    <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 shrink-0" /> Contrato fechado
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const Appointments = () => {
  const { currentAgencyId } = useAuth();
  const location = useLocation();
  const preSelectLeadId: string | undefined = (location.state as { preSelectLeadId?: string } | null)?.preSelectLeadId;

  const { appointments, loading: loadingApts, schedule, refresh: refreshApts } = useAppointments();
  const { properties, loading: loadingProps } = useProperties();
  const { agents, loading: loadingAgents } = useAgents();
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [allLeads, setAllLeads] = useState<LeadDto[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [schedulingFor, setSchedulingFor] = useState<LeadDto | null>(null);
  const [schedulingConfig, setSchedulingConfig] = useState<SchedulingConfigDto | null>(null);

  // Load approved leads (for pending panel) + all appointment-relevant leads (for name display)
  const loadLeads = useCallback(async () => {
    if (!currentAgencyId) return;
    setLoadingLeads(true);
    try {
      const [approvedData, scheduledData, contractedData, cancelledData, finishedData] = await Promise.all([
        listLeadsByAgency(currentAgencyId, 'approved'),
        listLeadsByAgency(currentAgencyId, 'visit_scheduled'),
        listLeadsByAgency(currentAgencyId, 'contracted'),
        listLeadsByAgency(currentAgencyId, 'visit_cancelled'),
        listLeadsByAgency(currentAgencyId, 'visit_finished'),
      ]);
      setLeads(approvedData.leads);
      setAllLeads([
        ...approvedData.leads,
        ...scheduledData.leads,
        ...contractedData.leads,
        ...cancelledData.leads,
        ...finishedData.leads,
      ]);
    } catch {
      // non-blocking
    } finally {
      setLoadingLeads(false);
    }
  }, [currentAgencyId]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Load agency scheduling config
  useEffect(() => {
    if (!currentAgencyId) return;
    getSchedulingConfig(currentAgencyId)
      .then(setSchedulingConfig)
      .catch(() => {}); // use null fallback
  }, [currentAgencyId]);

  // Auto-open modal when navigating from Dashboard with a specific lead pre-selected.
  // Wait for agents + properties to finish loading so ScheduleModal initialises with the
  // correct default agent (useState is only evaluated on first mount).
  useEffect(() => {
    if (!preSelectLeadId || leads.length === 0 || loadingAgents || loadingProps) return;
    const target = leads.find(l => l.id === preSelectLeadId);
    if (target) setSchedulingFor(target);
  }, [preSelectLeadId, leads, loadingAgents, loadingProps]);

  // Enrich appointments with related data
  const enriched = useMemo<EnrichedAppointment[]>(() => {
    const propMap  = new Map(properties.map(p => [p.id, p]));
    const leadMap  = new Map(allLeads.map(l => [l.id, l]));
    const agentMap = new Map(agents.map(a => [a.userId ?? a.id, a]));

    return appointments.map(a => ({
      ...a,
      property: propMap.get(a.propertyId),
      lead:     leadMap.get(a.leadId),
      agent:    agentMap.get(a.agentId),
    }));
  }, [appointments, properties, allLeads, agents]);

  // Approved leads without a confirmed/upcoming appointment (exclude contracted)
  const scheduledLeadIds = useMemo(
    () => new Set(appointments.filter(a => a.status === 'confirmed').map(a => a.leadId)),
    [appointments],
  );
  const pendingLeads = leads.filter(l =>
    l.status === 'approved' && !scheduledLeadIds.has(l.id) &&
    (propertyFilter === 'all' || l.propertyId === propertyFilter),
  );
  const cancelledLeads = allLeads.filter(l =>
    l.status === 'visit_cancelled' &&
    (propertyFilter === 'all' || l.propertyId === propertyFilter),
  );

  const filtered = enriched
    .filter(a => agentFilter === 'all' || a.agentId === agentFilter)
    .filter(a => propertyFilter === 'all' || a.propertyId === propertyFilter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const upcoming = filtered.filter(a => a.status === 'confirmed');
  const past     = filtered.filter(a => a.status !== 'confirmed');
  const today    = new Date().toISOString().slice(0, 10);

  const handleConfirm = async (input: {
    propertyId: string; leadId: string; agentId: string;
    date: string; time: string; notes?: string;
  }) => {
    try {
      await schedule(input);
      // Refresh approved leads so scheduled lead disappears from pending list
      await loadLeads();
      setSchedulingFor(null);
      toast({ title: 'Visita agendada!', description: `${input.date} às ${input.time}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar visita.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  };

  const handleComplete = async (apt: EnrichedAppointment) => {
    if (!currentAgencyId) return;
    try {
      await updateAppointmentStatus(currentAgencyId, apt.id, { status: 'completed' });
      refreshApts();
      await loadLeads();
      toast({ title: 'Visita finalizada', description: `${apt.lead?.name ?? 'Candidato'} — ${apt.date}` });
    } catch {
      toast({ title: 'Erro ao finalizar visita', variant: 'destructive' });
    }
  };

  const handleContract = async (apt: EnrichedAppointment) => {
    if (!currentAgencyId || !apt.lead) return;
    try {
      await contractLead(currentAgencyId, apt.lead.id);
      await loadLeads();
      toast({
        title: 'Contrato fechado! 🎉',
        description: `${apt.lead.name} foi marcado como arrendatário de ${apt.property?.title ?? 'imóvel'}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fechar contrato.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  };

  const handleCancel = async (apt: EnrichedAppointment) => {
    if (!currentAgencyId) return;
    try {
      await cancelAppointment(currentAgencyId, apt.id);
      refreshApts();
      await loadLeads();
      toast({ title: 'Visita cancelada', description: `${apt.date} às ${apt.time}` });
    } catch {
      toast({ title: 'Erro ao cancelar', variant: 'destructive' });
    }
  };

  const handleReschedule = async (apt: EnrichedAppointment) => {
    if (!currentAgencyId) return;
    try {
      await rescheduleAppointment(currentAgencyId, apt.id);
      refreshApts();
      await loadLeads();
      toast({
        title: 'Reagendamento iniciado',
        description: 'O candidato voltou para a lista de aprovados para agendar nova visita.',
      });
    } catch {
      toast({ title: 'Erro ao reagendar', variant: 'destructive' });
    }
  };

  const isLoading = loadingApts || loadingProps || loadingAgents || loadingLeads;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-2xl font-700 tracking-tight">Agendamentos</h1>
            <p className="text-sm text-muted-foreground mt-1">Visitas confirmadas e histórico</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-[180px] rounded-lg">
                <SelectValue placeholder="Todos os imóveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os imóveis</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.userId ?? a.id} value={a.userId ?? a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            A carregar agendamentos…
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Stat label="Próximas" value={upcoming.length} />
          <Stat label="Concluídas" value={enriched.filter(a => a.status === 'completed').length} />
          <Stat label="Hoje" value={upcoming.filter(a => a.date === today).length} />
          <Stat label="Aguardam agendamento" value={pendingLeads.length} />
        </div>

        {/* Pending scheduling — approved leads */}
        {pendingLeads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display font-600 text-sm">Candidatos aprovados — aguardam agendamento</h2>
              <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {pendingLeads.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingLeads.map(l => (
                <PendingCard
                  key={l.id}
                  lead={l}
                  property={properties.find(p => p.id === l.propertyId)}
                  onSchedule={() => setSchedulingFor(l)}
                  onLinkSent={loadLeads}
                />
              ))}
            </div>
          </motion.div>
        )}

        {cancelledLeads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display font-600 text-sm">Visitas canceladas — candidatos a reagendar</h2>
              <span className="text-[11px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {cancelledLeads.length}
              </span>
            </div>
            <div className="space-y-2">
              {cancelledLeads.map(l => (
                <CancelledCard
                  key={l.id}
                  lead={l}
                  property={properties.find(p => p.id === l.propertyId)}
                  onSchedule={() => setSchedulingFor(l)}
                  onLinkSent={loadLeads}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Appointment lists */}
        <Section title="Próximas visitas" items={upcoming} onCancel={handleCancel} onReschedule={handleReschedule} onComplete={handleComplete} />
        {past.length > 0 && <Section title="Histórico" items={past} muted onContract={handleContract} />}
      </div>

      {/* Schedule modal */}
      {schedulingFor && (
        <ScheduleModal
          agencyId={currentAgencyId}
          lead={schedulingFor}
          property={properties.find(p => p.id === schedulingFor.propertyId)}
          agents={agents}
          schedulingConfig={schedulingConfig}
          confirmedAppointments={appointments.filter(a => a.status === 'confirmed')}
          onClose={() => setSchedulingFor(null)}
          onConfirm={handleConfirm}
        />
      )}
    </DashboardLayout>
  );
};

export default Appointments;

