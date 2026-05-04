import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Clock, MapPin, CheckCircle,
  ChevronLeft, ChevronRight, Loader2, X, CalendarX2, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useToast } from '@/hooks/use-toast';
import {
  getVisitInfo,
  submitProposedSlots,
  type VisitInfoResponse,
  type ProposedSlotDto,
} from '@/lib/leads-api';
import { cancelAppointmentPublic, rescheduleAppointmentPublic } from '@/lib/appointments-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toLocalDateStr(date: Date) {
  return toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Generate HH:MM times within [start, end) at intervalMinutes. */
function generateSubSlotsPublic(start: string, end: string, intervalMinutes: number): string[] {
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

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDates,
  onToggleDate,
  minDate,
  availableWeekdays,
  blockedDates,
}: {
  selectedDates: Set<string>;
  onToggleDate: (d: string) => void;
  minDate: string;
  availableWeekdays?: number[];
  blockedDates?: Set<string>;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const cells = Array.from(
    { length: firstDow + daysInMonth },
    (_, i) => (i < firstDow ? null : i - firstDow + 1),
  );

  return (
    <div className="rounded-2xl border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="px-3 py-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const ds = toDateStr(viewYear, viewMonth, d);
            const isPast      = ds < minDate;
            const isDayOff    = availableWeekdays != null && !availableWeekdays.includes(new Date(ds + 'T00:00').getDay());
            const isBlocked   = blockedDates?.has(ds) ?? false;
            const isDisabled  = isPast || isDayOff || isBlocked;
            const isSelected  = selectedDates.has(ds);
            const isToday     = ds === toLocalDateStr(new Date());

            return (
              <button
                key={ds}
                type="button"
                disabled={isDisabled}
                onClick={() => onToggleDate(ds)}
                className={[
                  'h-9 w-full rounded-xl text-sm font-medium transition-all select-none',
                  isDisabled
                    ? 'text-gray-300 cursor-not-allowed line-through decoration-gray-300'
                    : 'cursor-pointer hover:bg-[#1a2341]/8',
                  isSelected
                    ? 'bg-[#1a2341] text-white font-semibold shadow-sm'
                    : isToday && !isDisabled
                    ? 'ring-2 ring-[#1a2341] text-[#1a2341] font-semibold'
                    : !isDisabled ? 'text-gray-700' : '',
                ].join(' ')}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step: choose dates + periods ─────────────────────────────────────────────

function StepChoose({
  info,
  onSubmit,
}: {
  info: VisitInfoResponse;
  onSubmit: (slots: ProposedSlotDto[]) => void;
}) {
  const config  = info.schedulingConfig;
  const maxPick = config?.maxClientChoices ?? 3;
  const periods = config?.periods ?? [
    { label: 'Manhã',           start: '09:00', end: '12:00' },
    { label: 'Início da tarde', start: '14:00', end: '16:00' },
    { label: 'Final do dia',    start: '16:00', end: '18:00' },
  ];
  const intervalMin = config?.agentSlotIntervalMinutes ?? 30;
  const maxVisitsPerTime = Math.max(config?.maxVisitsPerTime ?? 1, 1);
  const slotOccupancy = info.slotOccupancy ?? [];
  const blockedSlots = info.blockedSlots ?? [];
  const now = new Date();
  const today = toLocalDateStr(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const occupancyByDateTime = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const occ of slotOccupancy) {
      if (!map.has(occ.date)) map.set(occ.date, new Map());
      map.get(occ.date)!.set(occ.time, occ.count);
    }
    return map;
  }, [slotOccupancy]);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of blockedSlots) {
      if (!map.has(b.date)) map.set(b.date, new Set());
      map.get(b.date)!.add(b.time);
    }
    return map;
  }, [blockedSlots]);

  // Pre-compute: for each date, which period labels are fully booked
  // A period is unavailable only when ALL times in that period are either
  // blocked manually or already at max visits for that exact time.
  const fullyBookedPeriods = useMemo<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>();
    const dates = new Set<string>([
      ...occupancyByDateTime.keys(),
      ...blockedByDate.keys(),
    ]);

    for (const date of dates) {
      const occupancyForDate = occupancyByDateTime.get(date) ?? new Map<string, number>();
      const blockedForDate = blockedByDate.get(date) ?? new Set<string>();

      for (const period of periods) {
        const times = generateSubSlotsPublic(period.start, period.end, intervalMin)
          .filter((time) => date !== today || toMinutes(time) > nowMinutes);
        if (times.length === 0) {
          if (!map.has(date)) map.set(date, new Set());
          map.get(date)!.add(period.label);
          continue;
        }

        const allTimesUnavailable = times.every((time) => {
          if (blockedForDate.has(time)) return true;
          return (occupancyForDate.get(time) ?? 0) >= maxVisitsPerTime;
        });

        if (allTimesUnavailable) {
          if (!map.has(date)) map.set(date, new Set());
          map.get(date)!.add(period.label);
        }
      }
    }

    return map;
  }, [blockedByDate, occupancyByDateTime, periods, intervalMin, maxVisitsPerTime, nowMinutes, today]);

  // Dates where ALL periods are fully booked → disable in calendar
  const fullyBookedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const [date, bookedPeriodSet] of fullyBookedPeriods) {
      if (periods.every(p => bookedPeriodSet.has(p.label))) {
        dates.add(date);
      }
    }

    const todayBookedPeriods = fullyBookedPeriods.get(today);
    if (todayBookedPeriods && periods.every(p => todayBookedPeriods.has(p.label))) {
      dates.add(today);
    }

    return dates;
  }, [fullyBookedPeriods, periods, today]);

  const [slots, setSlots] = useState<ProposedSlotDto[]>([]);
  // date currently being period-picked
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const selectedDates = new Set(slots.map(s => s.date));
  const minDate = toLocalDateStr(new Date());

  const handleToggleDate = (date: string) => {
    if (fullyBookedDates.has(date)) return;
    if (pendingDate === date) {
      setPendingDate(null);
      return;
    }

    const hasAnyForDate = selectedDates.has(date);
    if (!hasAnyForDate && slots.length >= maxPick) return;
    setPendingDate(date);
  };

  const handlePickPeriod = (periodLabel: string) => {
    if (!pendingDate) return;
    setSlots((current) => {
      const alreadySelected = current.some(
        (slot) => slot.date === pendingDate && slot.periodLabel === periodLabel,
      );

      if (alreadySelected) {
        return current.filter(
          (slot) => !(slot.date === pendingDate && slot.periodLabel === periodLabel),
        );
      }

      if (current.length >= maxPick) return current;

      return [...current, { date: pendingDate, periodLabel }];
    });
  };

  const handleRemoveSlot = (idx: number) => {
    setSlots(s => s.filter((_, i) => i !== idx));
  };

  const formatDate = (ds: string) => {
    const d = new Date(ds + 'T00:00');
    return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const canSubmit = slots.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1a2341]">
          Escolha até {maxPick} {maxPick !== 1 ? 'opções' : 'opção'} de visita
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Seleccione um dia no calendário e depois o período que prefere.
          O agente confirmará a hora exacta dentro desse período.
        </p>
      </div>

      <MiniCalendar
        selectedDates={selectedDates}
        onToggleDate={handleToggleDate}
        minDate={minDate}
        availableWeekdays={config?.availableWeekdays}
        blockedDates={fullyBookedDates}
      />

      {/* Period picker */}
      <AnimatePresence>
        {pendingDate && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border bg-white p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#1a2341]">
                {formatDate(pendingDate)} — escolha um período
              </p>
              <button
                onClick={() => setPendingDate(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">
              Selecionados neste dia: {slots.filter((slot) => slot.date === pendingDate).length}
            </p>
            <div className="rounded-xl border border-[#1a2341]/10 bg-[#1a2341]/[0.02] px-3 py-2 mb-3">
              <p className="text-[11px] text-[#1a2341]/70 font-medium">
                Pode escolher mais de um período no mesmo dia. Clique novamente para remover.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {periods.map(p => {
                const isFullyBooked = fullyBookedPeriods.get(pendingDate)?.has(p.label) ?? false;
                const isSelected = slots.some(slot => slot.date === pendingDate && slot.periodLabel === p.label);
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={isFullyBooked && !isSelected}
                    onClick={() => handlePickPeriod(p.label)}
                    className={`group relative overflow-hidden w-full flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-[#1a2341]/[0.07] border-[#1a2341]/40 shadow-sm'
                        : isFullyBooked
                        ? 'cursor-not-allowed bg-gray-50 border-gray-200'
                        : 'bg-white border-[#1a2341]/20 hover:border-[#1a2341]/45 hover:shadow-sm hover:-translate-y-0.5'
                    }`}
                  >
                    {!isFullyBooked && !isSelected && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-[#1a2341]/[0.06] via-transparent to-[#c9a96e]/[0.10]" />
                    )}
                    <div className="relative z-10 w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-1.5">
                        <span className="font-semibold text-sm text-[#1a2341] leading-tight">{p.label}</span>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          isSelected
                            ? 'text-[#1a2341] border-[#1a2341]/25 bg-[#1a2341]/10'
                            : isFullyBooked
                            ? 'text-red-500 border-red-200 bg-red-50'
                            : 'text-emerald-700 border-emerald-200 bg-emerald-50'
                        }`}>
                          {isSelected ? 'Selecionado' : isFullyBooked ? 'Esgotado' : 'Disponível'}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white/80 border border-gray-200 rounded-lg px-2 py-1">
                        <Clock className="w-3 h-3" />
                        <span>{p.start} - {p.end}</span>
                      </div>
                    </div>
                    {isFullyBooked && !isSelected && (
                      <span className="relative z-10 text-[10px] text-red-400 font-semibold mt-2">Sem horários livres</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected slots */}
      {slots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            As suas opções ({slots.length}/{maxPick})
          </p>
          {slots.map((s, i) => (
            <div
              key={`${s.date}-${s.periodLabel}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a2341]/[0.04] border border-[#1a2341]/10"
            >
              <CalendarCheck className="w-4 h-4 text-[#1a2341] shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-[#1a2341]">{formatDate(s.date)}</span>
                <span className="text-gray-500 mx-2">·</span>
                <span className="text-gray-600">{s.periodLabel}</span>
              </div>
              <button
                onClick={() => handleRemoveSlot(i)}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        disabled={!canSubmit}
        onClick={() => onSubmit(slots)}
        className="w-full rounded-2xl h-12 font-semibold text-base"
        style={{ backgroundColor: '#1a2341' }}
      >
        <CalendarCheck className="w-4 h-4 mr-2" />
        Enviar preferências de visita
      </Button>
    </div>
  );
}

// ─── Step: success ────────────────────────────────────────────────────────────

function StepSuccess({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-[#1a2341] mb-2">
        Preferências enviadas!
      </h2>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Olá {name.split(' ')[0]}, as suas opções foram registadas.
        O agente entrará em contacto para confirmar a data e hora exacta.
      </p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisitSlotPicker() {
  const { candidateId: leadId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token') ?? '';
  const cancelToken    = searchParams.get('cancelToken') ?? '';
  const appointmentId  = searchParams.get('appointmentId') ?? '';
  const { toast } = useToast();

  const [info, setInfo]       = useState<VisitInfoResponse | null>(null);
  const [step, setStep]       = useState<'loading' | 'manage' | 'choose' | 'success' | 'cancelled' | 'error'>(
    cancelToken && appointmentId ? 'manage' : 'loading'
  );
  // appointmentId resolved from URL or from getVisitInfo (old email links)
  const [resolvedAptId, setResolvedAptId]           = useState(appointmentId);
  const [resolvedCancelToken, setResolvedCancelToken] = useState(cancelToken);
  const [actionBusy, setActionBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // New email links: appointmentId present → show manage view directly
    if (cancelToken && appointmentId) return;

    if (!leadId || !token) { setStep('error'); return; }

    getVisitInfo(leadId, token)
      .then(data => {
        setInfo(data);
        // Old email links: cancelToken present but no appointmentId
        // → backend returns activeAppointment so we can show manage view
        if (cancelToken && data.activeAppointment) {
          setResolvedAptId(data.activeAppointment.id);
          setResolvedCancelToken(data.activeAppointment.cancelToken);
          setStep('manage');
          return;
        }
        setStep(data.lead.proposedSlots.length > 0 ? 'success' : 'choose');
      })
      .catch(() => setStep('error'));
  }, [leadId, token, cancelToken, appointmentId]);

  const handlePublicCancel = async () => {
    setActionBusy(true);
    try {
      await cancelAppointmentPublic(resolvedAptId, resolvedCancelToken);
      setStep('cancelled');
    } catch {
      toast({ title: 'Erro ao cancelar. Tente novamente.', variant: 'destructive' });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublicReschedule = async () => {
    if (!leadId || !token) { setStep('error'); return; }
    setActionBusy(true);
    try {
      await rescheduleAppointmentPublic(resolvedAptId, resolvedCancelToken);
      const data = await getVisitInfo(leadId, token);
      setInfo(data);
      setStep('choose');
    } catch {
      toast({ title: 'Erro ao reagendar. Tente novamente.', variant: 'destructive' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmit = async (slots: ProposedSlotDto[]) => {
    if (!leadId) return;
    setSubmitting(true);
    try {
      await submitProposedSlots(leadId, token, slots);
      setStep('success');
    } catch {
      toast({ title: 'Erro ao enviar preferências. Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <p className="font-display text-xl font-700 tracking-tight" style={{ color: '#1a2341' }}>
          vyllad<span style={{ color: '#c9a96e' }}>.</span>
        </p>
        {info?.property && (
          <span className="text-sm text-gray-500 flex items-center gap-1.5 border-l pl-3 ml-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {info.property.title}
            {info.property.location && (
              <span className="text-gray-400">· {info.property.location}</span>
            )}
          </span>
        )}
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border shadow-sm p-6 sm:p-8"
          >
            {step === 'loading' && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
              </div>
            )}

            {step === 'manage' && (
              <div className="text-center py-8 space-y-5">
                <div className="w-14 h-14 rounded-full bg-[#1a2341]/[0.06] flex items-center justify-center mx-auto">
                  <CalendarCheck className="w-7 h-7 text-[#1a2341]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1a2341]">Gerir a sua visita</h2>
                  <p className="text-sm text-gray-500 mt-1">O que pretende fazer com a visita agendada?</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handlePublicReschedule}
                    disabled={actionBusy}
                    className="w-full gap-2 bg-[#1a2341] hover:bg-[#1a2341]/90"
                  >
                    {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Reagendar visita
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePublicCancel}
                    disabled={actionBusy}
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarX2 className="w-4 h-4" />}
                    Cancelar visita
                  </Button>
                </div>
              </div>
            )}

            {step === 'cancelled' && (
              <div className="text-center py-10 space-y-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <CalendarX2 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">Visita cancelada</p>
                <p className="text-sm text-gray-500">A sua visita foi cancelada com sucesso. A agência foi notificada.</p>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center py-10">
                <p className="text-base font-semibold text-gray-700">Link inválido ou expirado</p>
                <p className="text-sm text-gray-500 mt-2">
                  Se tiver dúvidas, contacte a agência diretamente.
                </p>
              </div>
            )}

            {step === 'choose' && info && (
              <StepChoose
                info={info}
                onSubmit={handleSubmit}
              />
            )}

            {step === 'success' && info && (
              <StepSuccess name={info.lead.name} />
            )}

            {(submitting || (actionBusy && step === 'loading')) && (
              <div className="absolute inset-0 bg-white/70 rounded-3xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> O agente confirmará a hora exacta
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
