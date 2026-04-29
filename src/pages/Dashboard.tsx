import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Calendar, CheckCircle, XCircle, Clock, Eye, Filter,
  Flame, BanIcon, ChevronRight, ChevronDown, Users, TrendingUp,
  Timer, Gauge,
  ArrowUpRight, CalendarCheck, MoreHorizontal, Pencil, PauseCircle, PlayCircle, Archive, KeyRound, RotateCcw, Trophy, Home,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Candidate, Property } from '@/lib/types';
import { useLeads } from '@/hooks/useLeads';
import { contractLead, revertContractLead } from '@/lib/leads-api';
import { listAppointments, updateAppointmentStatus, type AppointmentDto } from '@/lib/appointments-api';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyDto } from '@/lib/properties-api';
import { useProperties } from '@/hooks/useProperties';
import { useAgents } from '@/hooks/useAgents';
import AddPropertyDialog from '@/components/dashboard/AddPropertyDialog';
import EditPropertyDialog from '@/components/dashboard/EditPropertyDialog';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LeadDetailSheet from '@/components/dashboard/LeadDetailSheet';
import BuyLeadsDialog from '@/components/dashboard/BuyLeadsDialog';
import { usePlans } from '@/plans';
// Adapts PropertyDto (API) to the Property shape expected by internal components
function toProperty(dto: PropertyDto): Property {
  return {
    ...dto,
    description: dto.description ?? '',
    price: dto.rentalPrice,
    images: dto.images,
    availableSlots: [],
    criteria: {
      minIncome: dto.criteria.minIncome,
      maxPeople: dto.criteria.maxPeople,
      petsAllowed: dto.criteria.petsAllowed,
      advanceMonths: dto.criteria.advanceMonths,
      depositMonths: dto.criteria.depositMonths,
      guarantorRequired: dto.criteria.guarantorRequired,
      advanceWithoutGuarantor: dto.criteria.advanceWithoutGuarantor ?? undefined,
      depositWithoutGuarantor: dto.criteria.depositWithoutGuarantor ?? undefined,
    },
  };
}


// ─── Priority config ──────────────────────────────────────────────────────────
function getPriorityConfig(c: Candidate) {
  if (c.status === 'visit_scheduled') return {
    badge: 'border-blue-200 bg-blue-50 text-blue-600',
    dot: 'bg-blue-500',
    label: 'Visita marcada',
  };
  if (c.score >= 80) return {
    badge: 'border-border/60 bg-card text-foreground',
    dot: 'bg-emerald-500',
    label: 'Contactar agora',
  };
  if (c.score >= 60) return {
    badge: 'border-border/60 bg-card text-foreground',
    dot: 'bg-amber-400',
    label: 'Avaliar',
  };
  return {
    badge: 'border-border/60 bg-card text-muted-foreground',
    dot: 'bg-muted-foreground/30',
    label: 'Desprioritizar',
  };
}

const statusConfig: Record<Candidate['status'], { label: string; icon: typeof Clock; className: string }> = {
  new: { label: 'Novo', icon: Clock, className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprovado', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600' },
  rejected: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  visit_scheduled: { label: 'Visita marcada', icon: Calendar, className: 'bg-blue-500/10 text-blue-600' },
  visit_cancelled: { label: 'Visita cancelada', icon: XCircle, className: 'bg-orange-500/10 text-orange-600' },
  visit_finished: { label: 'Visita realizada', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600' },
  contracted: { label: 'Contrato fechado', icon: CheckCircle, className: 'bg-violet-500/10 text-violet-600' },
};

// ─── Score circle ─────────────────────────────────────────────────────────────
function ScoreCircle({ score, classification, glass = false }: { score: number; classification: Candidate['classification']; glass?: boolean }) {
  const s =
    classification === 'excellent'
      ? { bg: glass ? 'bg-emerald-400/20 ring-emerald-300/30' : 'bg-emerald-50 ring-emerald-200', text: glass ? 'text-emerald-200' : 'text-emerald-700' }
      : classification === 'potential'
      ? { bg: glass ? 'bg-amber-400/20 ring-amber-300/30' : 'bg-amber-50 ring-amber-200', text: glass ? 'text-amber-200' : 'text-amber-700' }
      : { bg: glass ? 'bg-white/10 ring-white/20' : 'bg-slate-100 ring-slate-200', text: glass ? 'text-white/70' : 'text-slate-500' };
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ${s.bg}`}>
      <span className={`font-display font-700 text-sm leading-none ${s.text}`}>{score}</span>
    </div>
  );
}


function quickInsight(c: Candidate): string {
  const incomeScore   = c.factorScores?.incomeRatio ?? 0;
  const guarantorScore = c.factorScores?.guarantor  ?? 0;
  if (c.hasPets && c.score < 50) return 'Animais · compatibilidade baixa com o imóvel';
  if (c.score >= 80 && c.urgency === 'immediate') return 'Perfil excelente · pronto para fechar';
  if (c.score >= 80 && c.urgency === 'soon') return 'Excelente perfil · disponível em breve';
  if (c.score >= 80) return 'Excelente perfil financeiro e laboral';
  if (c.score >= 60 && c.urgency === 'immediate') return 'Bom perfil · alta urgência de mudança';
  if (incomeScore < 30) return 'Rendimento abaixo do mínimo recomendado';
  if (guarantorScore < 40) return 'Garantias insuficientes para este imóvel';
  if (c.score >= 60) return 'Perfil razoável · sem urgência imediata';
  return 'Baixa compatibilidade com os critérios';
}

// ─── Smart Insights Panel ─────────────────────────────────────────────────────
function SmartInsightsPanel({
  allCandidates,
  planLimit,
  properties,
  onSelectCandidate,
  onApprove,
  onReject,
  onSchedule,
  onReschedule,
  onComplete,
  onContract,
  onRevertContract,
}: {
  allCandidates: Candidate[];
  planLimit: number | null;
  properties: Property[];
  onSelectCandidate: (c: Candidate) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSchedule: (c: Candidate) => void;
  onReschedule: (c: Candidate) => void;
  onComplete: (c: Candidate) => void;
  onContract: (c: Candidate) => void;
  onRevertContract: (c: Candidate) => void;
}) {
  // Candidates within the plan limit = first N by arrival date (oldest first)
  const withinLimitCandidates = planLimit !== null
    ? [...allCandidates]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, planLimit)
    : allCandidates;

  const topLeads = [...withinLimitCandidates]
    .filter(c => c.status !== 'rejected')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const readyNow = allCandidates.filter(
    c => c.urgency === 'immediate' && c.classification !== 'low' && c.status !== 'rejected'
  );
  const ignore = allCandidates.filter(c => c.classification === 'low' && c.status === 'new');

  const [tab, setTab] = useState<'top' | 'ready' | 'ignore'>('top');
  const displayed = tab === 'top' ? topLeads : tab === 'ready' ? readyNow : ignore;

  const tabs = [
    { key: 'top' as const, icon: Flame, label: 'Top 5 hoje', count: topLeads.length, color: 'text-orange-500' },
    { key: 'ready' as const, icon: Timer, label: 'Prontos agora', count: readyNow.length, color: 'text-emerald-500' },
    { key: 'ignore' as const, icon: BanIcon, label: 'Para ignorar', count: ignore.length, color: 'text-muted-foreground' },
  ];

  const subtitles: Record<typeof tab, string> = {
    top: 'Maior probabilidade de conversão. Contacta primeiro.',
    ready: 'Alta urgência de mudança — não percas tempo.',
    ignore: 'Baixa compatibilidade com os critérios. Poupa energia.',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border bg-card overflow-hidden mb-8"
    >
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors relative ${
              tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className={`w-4 h-4 ${t.key === tab ? t.color : ''}`} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{t.count}</span>
            {tab === t.key && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3 font-medium">{subtitles[tab]}</p>
            {displayed.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">Nenhum lead nesta categoria.</p>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {displayed.map((c, i) => {
                    const prop = properties.find(p => p.id === c.propertyId);
                    const insight = quickInsight(c);
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => onSelectCandidate(c)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                      >
                        {tab === 'top' && (
                          <span className="text-xs font-display font-700 text-muted-foreground/30 w-4 shrink-0 text-center">{i + 1}</span>
                        )}
                        <ScoreCircle score={c.score} classification={c.classification} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{c.name}</span>
                            {c.status === 'approved' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />Aprovado
                              </span>
                            )}
                            {c.status === 'visit_scheduled' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />Visita marcada
                              </span>
                            )}
                            {c.urgency === 'immediate' && c.status !== 'visit_scheduled' && (
                              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                                <Timer className="w-3 h-3" />Urgente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{insight}</p>
                        </div>
                        {prop && (
                          <span className="text-[10px] text-muted-foreground/50 hidden sm:block shrink-0 max-w-[120px] truncate">{prop.title}</span>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.status === 'new' && (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); onApprove(c.id); }}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); onReject(c.id); }}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Rejeitar
                              </button>
                            </>
                          )}
                          {c.status === 'approved' && (
                            <button
                              onClick={e => { e.stopPropagation(); onSchedule(c); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <CalendarCheck className="w-3 h-3" /> Agendar
                            </button>
                          )}
                          {c.status === 'visit_cancelled' && (
                            <button
                              onClick={e => { e.stopPropagation(); onReschedule(c); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Reagendar
                            </button>
                          )}
                          {c.status === 'visit_scheduled' && (
                            <button
                              onClick={e => { e.stopPropagation(); onComplete(c); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Finalizar
                            </button>
                          )}
                          {c.status === 'visit_finished' && (
                            <button
                              onClick={e => { e.stopPropagation(); onContract(c); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 transition-colors"
                            >
                              <Trophy className="w-3.5 h-3.5" /> Fechar Contrato
                            </button>
                          )}
                          {c.status === 'contracted' && (
                            <button
                              onClick={e => { e.stopPropagation(); onRevertContract(c); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Reverter
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
      </div>
    </motion.div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({
  candidate,
  property,
  onClick,
  onApprove,
  onReject,
  onSchedule,
  onReschedule,
  onComplete,
  onContract,
  onRevertContract,
}: {
  candidate: Candidate;
  property: Property | undefined;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSchedule?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onContract?: () => void;
  onRevertContract?: () => void;
}) {
  const priority = getPriorityConfig(candidate);
  const sc = statusConfig[candidate.status];
  const StatusIcon = sc.icon;
  const insight = quickInsight(candidate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-center gap-4 px-4 py-4 rounded-2xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <ScoreCircle score={candidate.score} classification={candidate.classification} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{candidate.name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${priority.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dot}`} />
            {priority.label}
          </span>
          {candidate.urgency === 'immediate' && candidate.status === 'new' && (
            <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <Timer className="w-3 h-3" />Agora
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{insight}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />€{candidate.monthlyIncome.toLocaleString('pt-PT')}/mês
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />{candidate.numberOfPeople} pessoa{candidate.numberOfPeople > 1 ? 's' : ''}
          </span>
          {property && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{property.title}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Status badge */}
        <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${sc.className}`}>
          <StatusIcon className="w-3 h-3" />{sc.label}
        </span>

        {/* Quick actions — novos: aprovar / rejeitar */}
        {candidate.status === 'new' && onApprove && onReject && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); onApprove(); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Aprovar
            </button>
            <button
              onClick={e => { e.stopPropagation(); onReject(); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Rejeitar
            </button>
          </div>
        )}

        {/* Quick action — aprovados: agendar */}
        {candidate.status === 'approved' && onSchedule && (
          <button
            onClick={e => { e.stopPropagation(); onSchedule(); }}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CalendarCheck className="w-3 h-3" /> Agendar
          </button>
        )}

        {/* Quick action — visita cancelada: reagendar */}
        {candidate.status === 'visit_cancelled' && onReschedule && (
          <button
            onClick={e => { e.stopPropagation(); onReschedule(); }}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reagendar
          </button>
        )}

        {/* Quick actions — visita marcada: finalizar */}
        {candidate.status === 'visit_scheduled' && onComplete && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); onComplete(); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Finalizar
            </button>
          </div>
        )}

        {/* Quick action — visita realizada: fechar contrato */}
        {candidate.status === 'visit_finished' && onContract && (
          <button
            onClick={e => { e.stopPropagation(); onContract(); }}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" /> Fechar Contrato
          </button>
        )}

        {/* Quick action — contrato fechado: reverter */}
        {candidate.status === 'contracted' && onRevertContract && (
          <button
            onClick={e => { e.stopPropagation(); onRevertContract(); }}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reverter
          </button>
        )}

        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
      </div>
    </motion.div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ candidates, glass = false }: { candidates: Candidate[]; glass?: boolean }) {
  const total = candidates.length;
  const excellent = candidates.filter(c => c.classification === 'excellent').length;
  const visitsScheduled = candidates.filter(c => c.status === 'visit_scheduled').length;
  const avgScore = total > 0 ? Math.round(candidates.reduce((s, c) => s + c.score, 0) / total) : 0;

  const stats = [
    { label: 'Candidatos', value: total, icon: Users, sub: 'total', accent: null },
    { label: 'Alta prioridade', value: excellent, icon: ArrowUpRight, sub: 'para contactar', accent: excellent > 0 ? 'emerald' : null },
    { label: 'Visitas marcadas', value: visitsScheduled, icon: CalendarCheck, sub: 'confirmadas', accent: visitsScheduled > 0 ? 'blue' : null },
    { label: 'Score médio', value: avgScore, icon: TrendingUp, sub: 'dos candidatos', accent: avgScore >= 70 ? 'amber' : null },
  ];

  const accentText: Record<string, string> = { emerald: 'text-emerald-400', blue: 'text-blue-400', amber: 'text-amber-400' };
  const accentIcon: Record<string, string> = { emerald: 'text-emerald-300', blue: 'text-blue-300', amber: 'text-amber-300' };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, sub, accent }) => (
        <div key={label} className={glass
          ? 'rounded-2xl p-4 backdrop-blur-md bg-white/10 ring-1 ring-white/20'
          : `rounded-2xl border p-4 bg-card ${accent === 'emerald' ? 'border-emerald-500/20' : ''}`
        }>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${glass ? 'text-white/60' : 'text-muted-foreground'}`}>{label}</span>
            <Icon className={`w-4 h-4 ${glass ? (accent ? accentIcon[accent] : 'text-white/30') : (accent ? 'text-emerald-500' : 'text-muted-foreground/40')}`} />
          </div>
          <div className={`font-display text-2xl font-700 tracking-tight ${glass ? (accent ? accentText[accent] : 'text-white') : (accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : '')}`}>
            {value}
          </div>
          <p className={`text-[11px] mt-0.5 ${glass ? 'text-white/40' : 'text-muted-foreground/60'}`}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardSplash() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1115]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_36%),linear-gradient(135deg,#151922_0%,#0f1115_55%,#0b0d11_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="relative flex h-40 w-40 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            >
              <div className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#d4a24c] shadow-[0_0_18px_rgba(212,162,76,0.7)]" />
            </motion.div>
            <div className="absolute inset-4 rounded-full border border-white/10" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(212,162,76,0.12),transparent_62%)]" />
            <div className="relative text-center">
              <div className="font-display text-4xl font-700 tracking-tight text-white">
                vyllad
                <span className="text-[#d4a24c]">.</span>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="text-white text-sm font-semibold tracking-[0.24em] uppercase">A preparar dashboard</p>
            <p className="mt-2 text-sm text-white/55">A carregar imagem, imóveis e candidatos.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const CANDIDATES_PAGE_SIZE = 10;

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { currentAgencyId, user, status: authStatus } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPropertyDto, setEditingPropertyDto] = useState<PropertyDto | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(
    (location.state as { propertyId?: string } | null)?.propertyId ?? null
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<'active' | 'closed'>('active');
  const [candidatesPage, setCandidatesPage] = useState(1);

  const { properties: propertyDtos, loading: propertiesLoading, setStatus: setPropertyStatus, refresh: refreshProperties } = useProperties();
  const { agents: realAgents } = useAgents();
  const { plans } = usePlans();
  const userPlan = plans.find(p => p.backendPlanId === user?.planId);
  const maxProperties = userPlan?.limits.properties ?? null;
  // Extra lead support (button visibility only — dialog fetches live state)
  const extraLeadMarket = userPlan?.marketPrices?.find(mp => mp.market === 'EUROPE') ?? userPlan?.marketPrices?.[0] ?? null;
  const extraLeadPrice = extraLeadMarket?.extraLeadPrice ?? null;
  const [buyLeadsOpen, setBuyLeadsOpen] = useState(false);
  const activeCount = propertyDtos.filter(p => p.status === 'ACTIVE').length;
  const atLimit = maxProperties !== null && activeCount >= maxProperties;
  const filteredProperties = propertyDtos
    .filter(p => propertyStatusFilter === 'active'
      ? (p.status === 'ACTIVE' || p.status === 'PAUSED')
      : (p.status === 'RENTED' || p.status === 'ARCHIVED'))
    .map(toProperty);
  const effectiveSelected = selectedProperty ?? filteredProperties[0]?.id ?? null;
  const selectedPropertyDto = propertyDtos.find(p => p.id === effectiveSelected) ?? null;
  const property = filteredProperties.find(p => p.id === effectiveSelected) ?? null;

  const { candidates, scoringConfig, loading: leadsLoading, setStatus: setLeadStatus, refresh: refreshLeads, planLimit: leadPlanLimit, leadsTotal, hiddenCount: leadsHiddenCount } = useLeads(effectiveSelected);
  const remainingLeads = leadPlanLimit !== null ? Math.max(0, leadPlanLimit - leadsTotal) : null;
  const atLeadLimit = leadPlanLimit !== null && leadsTotal >= leadPlanLimit;
  const nearLeadLimit = !atLeadLimit && leadPlanLimit !== null && leadsTotal / leadPlanLimit >= 0.80;
  const [propertyAppointments, setPropertyAppointments] = useState<AppointmentDto[]>([]);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  // Load confirmed appointments for the selected property
  useEffect(() => {
    if (!currentAgencyId || !effectiveSelected) { setPropertyAppointments([]); return; }
    listAppointments(currentAgencyId, { propertyId: effectiveSelected, status: 'confirmed', take: 50 })
      .then(r => setPropertyAppointments(r.items))
      .catch(() => setPropertyAppointments([]));
  }, [currentAgencyId, effectiveSelected]);
  const [isSwitchingProperty, setIsSwitchingProperty] = useState(false);
  const transitionStartedAtRef = useRef<number>(Date.now());

  const propertyCandidates = useMemo(() => {
    return candidates
      .filter(c => scoreFilter === 'all' || (
        scoreFilter === 'high' ? c.score >= 80 :
        scoreFilter === 'mid' ? c.score >= 60 && c.score < 80 :
        c.score < 60
      ))
      .filter(c => statusFilter === 'all' || c.status === statusFilter)
      .filter(c => urgencyFilter === 'all' || c.urgency === urgencyFilter)
      .sort((a, b) => b.score - a.score);
  }, [candidates, scoreFilter, statusFilter, urgencyFilter]);

  // Reset to page 1 whenever filters or selected property changes
  useEffect(() => { setCandidatesPage(1); }, [scoreFilter, statusFilter, urgencyFilter, effectiveSelected]);

  const candidatesTotalPages = Math.max(1, Math.ceil(propertyCandidates.length / CANDIDATES_PAGE_SIZE));
  const paginatedCandidates = propertyCandidates.slice(
    (candidatesPage - 1) * CANDIDATES_PAGE_SIZE,
    candidatesPage * CANDIDATES_PAGE_SIZE
  );

  const allAgentCandidates = useMemo(() =>
    candidates,
    [candidates]
  );

  const candidateProperty = useMemo(
    () => selectedCandidate ? (filteredProperties.find(p => p.id === selectedCandidate.propertyId) ?? property) : null,
    [selectedCandidate, filteredProperties, property]
  );

  async function handleStatusChange(id: string, status: Candidate['status']) {
    await setLeadStatus(id, status);
  }

  async function handleContract(id: string) {
    if (!currentAgencyId) return;
    try {
      await contractLead(currentAgencyId, id);
      await refreshLeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      toast({
        variant: 'destructive',
        title: 'Imóvel já reservado',
        description: msg ?? 'Outro lead já tem contrato fechado para este imóvel.',
      });
    }
  }

  async function handleRevertContract(id: string) {
    if (!currentAgencyId) return;
    try {
      await revertContractLead(currentAgencyId, id);
      await refreshLeads();
    } catch {
      // silently ignore
    }
  }

  async function handleComplete(leadId: string) {
    if (!currentAgencyId) return;
    try {
      const { items } = await listAppointments(currentAgencyId, { leadId, status: 'confirmed', take: 1 });
      if (!items.length) return;
      await updateAppointmentStatus(currentAgencyId, items[0].id, { status: 'completed' });
      await refreshLeads();
    } catch {
      // silently ignore
    }
  }

  function openCandidate(c: Candidate) {
    setSelectedCandidate(c);
    setSheetOpen(true);
  }

  function handleSelectProperty(nextPropertyId: string | null) {
    if (nextPropertyId === effectiveSelected) return;

    transitionStartedAtRef.current = Date.now();
    setIsSwitchingProperty(true);
    setSelectedProperty(nextPropertyId);
  }

  const propertyAgents = realAgents.filter(a => property?.agentIds.includes(a.id));
  const isDataReady = authStatus !== 'loading' && !propertiesLoading && (!effectiveSelected || !leadsLoading);
  const showInitialSplash = !hasBootstrapped;

  useEffect(() => {
    if (!hasBootstrapped && isDataReady) {
      setHasBootstrapped(true);
    }
  }, [hasBootstrapped, isDataReady]);

  useEffect(() => {
    if (!isSwitchingProperty || !isDataReady) return;

    const elapsed = Date.now() - transitionStartedAtRef.current;
    const minimumVisibleMs = 260;
    const remaining = Math.max(0, minimumVisibleMs - elapsed);

    const timeoutId = window.setTimeout(() => {
      setIsSwitchingProperty(false);
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [isDataReady, isSwitchingProperty]);

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        {showInitialSplash ? (
          <motion.div
            key="dashboard-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <DashboardSplash />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="min-h-screen">
              <AnimatePresence>
                {isSwitchingProperty && (
                  <motion.div
                    key="property-switch-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f1115]/82 backdrop-blur-sm"
                  >
                    <div className="relative flex h-36 w-36 items-center justify-center">
                      <div className="absolute inset-5 rounded-full border border-white/14" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-5"
                      >
                        <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4a24c] shadow-[0_0_18px_rgba(212,162,76,0.75)]" />
                      </motion.div>
                      <div className="font-display text-3xl font-700 tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                        vyllad<span className="text-[#d4a24c]">.</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── All content on top of the background ────────────────────────── */}
              <div className="min-h-screen">
                <div className="p-6 md:p-8 max-w-5xl mx-auto">

                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between mb-6 gap-4"
                  >
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-1">Dashboard</p>
                      <h1 className="font-display text-2xl md:text-3xl font-700 tracking-tight text-foreground leading-tight">
                        {property?.title ?? 'Imóveis'}
                      </h1>
                      {(property?.rentalPrice ?? property?.price) && (
                        <p className="text-muted-foreground text-sm mt-0.5">
                          €{(property.rentalPrice ?? property.price)?.toLocaleString('pt-PT')}/mês
                          {selectedPropertyDto?.status === 'PAUSED' && (
                            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">Pausado</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {maxProperties !== null && (
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          activeCount >= maxProperties
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : activeCount / maxProperties >= 0.8
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-muted text-muted-foreground border-border/60'
                        }`}>
                          <Home className="w-2.5 h-2.5" />
                          {activeCount} / {maxProperties} imóveis ativos
                        </span>
                      )}
                      {atLimit ? (
                        <Button
                          size="sm"
                          onClick={() => navigate('/onboarding/upgrade')}
                          className="gap-1.5 rounded-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-sm"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Fazer upgrade
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setAddOpen(true)}
                          size="sm"
                          className="gap-2 rounded-full font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">Novo imóvel</span>
                        </Button>
                      )}
                    </div>
                  </motion.div>

          {propertyDtos.length === 0 ? (
            <div className="rounded-2xl border bg-card p-16 text-center">
              <p className="text-sm text-muted-foreground">Nenhum imóvel atribuído a este agente.</p>
            </div>
          ) : (
            <>
              {/* Property selector bar */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {/* Active/closed toggle */}
                <div className="flex items-center gap-1 p-1 rounded-full bg-muted ring-1 ring-border shrink-0">
                  <button
                    onClick={() => { setPropertyStatusFilter('active'); handleSelectProperty(null); }}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      propertyStatusFilter === 'active' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >Ativos</button>
                  <button
                    onClick={() => { setPropertyStatusFilter('closed'); handleSelectProperty(null); }}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      propertyStatusFilter === 'closed' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >Encerrados</button>
                </div>
                {/* Property selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex order-3 sm:order-none basis-full sm:basis-auto items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-border text-foreground hover:bg-muted transition-all outline-none w-full sm:w-[360px] max-w-full min-w-0">
                      {property?.images?.[0] ? (
                        <img src={property.images[0]} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <Home className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold truncate flex-1 min-w-0 text-left">
                        {property?.title ?? 'Selecionar imóvel'}
                      </span>
                      <ChevronDown className="w-3 h-3 shrink-0 text-white/60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-1.5">
                    {filteredProperties.map(p => {
                      const isActive = effectiveSelected === p.id;
                      return (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() => handleSelectProperty(p.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${
                            isActive ? 'bg-primary/10 text-primary font-semibold' : ''
                          }`}
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Home className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug whitespace-normal break-words">{p.title}</p>
                            {(p.rentalPrice ?? p.price) && (
                              <p className="text-xs text-muted-foreground">€{(p.rentalPrice ?? p.price)?.toLocaleString('pt-PT')}/mês</p>
                            )}
                          </div>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Property actions */}
                <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                  {property?.slug && (
                    <Link
                      to={`/p/${property.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-white text-foreground hover:bg-muted transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ver página</span>
                    </Link>
                  )}
                  {selectedPropertyDto && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border bg-white hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => { setEditingPropertyDto(selectedPropertyDto); setEditOpen(true); }} className="gap-2">
                          <Pencil className="w-3.5 h-3.5" /> Editar imóvel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {selectedPropertyDto.status === 'ACTIVE' ? (
                          <DropdownMenuItem onClick={() => setPropertyStatus(selectedPropertyDto.id, 'PAUSED')} className="gap-2">
                            <PauseCircle className="w-3.5 h-3.5" /> Pausar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setPropertyStatus(selectedPropertyDto.id, 'ACTIVE')} className="gap-2">
                            <PlayCircle className="w-3.5 h-3.5" /> Retomar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="gap-2 text-destructive focus:text-destructive data-[state=open]:text-destructive">
                            <Archive className="w-3.5 h-3.5" /> Encerrar
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-44">
                            <DropdownMenuItem onClick={() => setPropertyStatus(selectedPropertyDto.id, 'RENTED')} className="gap-2">
                              <KeyRound className="w-3.5 h-3.5" /> Imóvel arrendado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPropertyStatus(selectedPropertyDto.id, 'ARCHIVED')} className="gap-2 text-destructive focus:text-destructive">
                              <Archive className="w-3.5 h-3.5" /> Retirar imóvel
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {propertyAgents.length > 0 && (
                    <div className="flex -space-x-1">
                      {propertyAgents.map(a => (
                        <img
                          key={a.id}
                          src={a.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(a.name)}`}
                          alt={a.name}
                          title={a.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover ring-2 ring-background"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {filteredProperties.length === 0 ? (
                <div className="rounded-2xl border bg-card p-12 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum imóvel encerrado.</p>
                </div>
              ) : (
                <>
                  {/* Stats row */}
                  <div className="mb-6">
                    <StatsRow candidates={allAgentCandidates} />
                  </div>

                  {/* Smart Insights */}
                  <SmartInsightsPanel
                    allCandidates={allAgentCandidates}
                    planLimit={leadPlanLimit}
                    properties={filteredProperties}
                    onSelectCandidate={openCandidate}
                    onApprove={id => handleStatusChange(id, 'approved')}
                    onReject={id => handleStatusChange(id, 'rejected')}
                    onSchedule={c => navigate('/appointments', { state: { preSelectLeadId: c.id } })}
                    onReschedule={c => navigate('/appointments', { state: { preSelectLeadId: c.id } })}
                    onComplete={c => handleComplete(c.id)}
                    onContract={c => handleContract(c.id)}
                    onRevertContract={c => handleRevertContract(c.id)}
                  />

                  {/* Upcoming visits */}
                  {propertyAppointments.filter(a => a.status === 'confirmed').length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border bg-card p-5 mb-8"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                        Visitas confirmadas
                      </h3>
                      <div className="space-y-2">
                        {propertyAppointments
                          .filter(a => a.status === 'confirmed')
                          .map(apt => {
                            const cand = candidates.find(c => c.id === apt.leadId);
                            return (
                              <div key={apt.id} className="flex items-center gap-3 text-sm">
                                <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="font-medium">{cand?.name ?? '—'}</span>
                                <span className="text-muted-foreground">{apt.date} às {apt.time}</span>
                                {apt.notes && (
                                  <span className="text-xs text-muted-foreground/60 hidden sm:block truncate">{apt.notes}</span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}

                  {/* Filters + Lead list */}
                  <div className="flex flex-wrap gap-2.5 mb-5 items-center">
                    <h2 className="font-display font-700 text-base flex-1 text-foreground">
                      Todos os candidatos
                      <span className="ml-2 text-sm font-400 text-muted-foreground font-sans">
                        ({propertyCandidates.length})
                      </span>
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="h-8 text-xs rounded-lg w-[130px]">
                          <Filter className="w-3 h-3 mr-1.5" />
                          <SelectValue placeholder="Score" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os scores</SelectItem>
                          <SelectItem value="high">Alta prioridade (80+)</SelectItem>
                          <SelectItem value="mid">Média (60–79)</SelectItem>
                          <SelectItem value="low">Baixa (&lt;60)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                        <SelectTrigger className="h-8 text-xs rounded-lg w-[120px]">
                          <Timer className="w-3 h-3 mr-1.5" />
                          <SelectValue placeholder="Urgência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toda urgência</SelectItem>
                          <SelectItem value="immediate">Urgente</SelectItem>
                          <SelectItem value="soon">Em breve</SelectItem>
                          <SelectItem value="flexible">Flexível</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs rounded-lg w-[130px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os estados</SelectItem>
                          <SelectItem value="new">Novos</SelectItem>
                          <SelectItem value="approved">Aprovados</SelectItem>
                          <SelectItem value="visit_scheduled">Visita marcada</SelectItem>
                          <SelectItem value="rejected">Rejeitados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ── Lead limit banner ───────────────────────────────── */}
                  {(atLeadLimit || nearLeadLimit || leadsHiddenCount > 0) && (
                    <div className={`mb-4 relative overflow-hidden rounded-2xl border px-5 py-4 ${
                      atLeadLimit || leadsHiddenCount > 0
                        ? 'bg-destructive/[0.04] border-destructive/15'
                        : 'bg-accent/[0.06] border-accent/20'
                    }`}>
                      {/* left accent stripe */}
                      <div className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 ${
                        atLeadLimit || leadsHiddenCount > 0 ? 'bg-destructive/40' : 'bg-accent/60'
                      }`} />
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                          atLeadLimit || leadsHiddenCount > 0 ? 'bg-destructive/10' : 'bg-accent/15'
                        }`}>
                          <Gauge className={`w-4 h-4 ${
                            atLeadLimit || leadsHiddenCount > 0 ? 'text-destructive' : 'text-accent-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {leadsHiddenCount > 0 ? (
                            <>
                              <p className="text-sm font-semibold tracking-tight">
                                {leadsHiddenCount} candidato{leadsHiddenCount !== 1 ? 's' : ''} oculto{leadsHiddenCount !== 1 ? 's' : ''} por limite de leads
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                O teu plano está no limite de {leadPlanLimit} leads para este imóvel.
                              </p>
                            </>
                          ) : atLeadLimit ? (
                            <>
                              <p className="text-sm font-semibold tracking-tight">Limite de leads atingido</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Novos candidatos não serão recebidos até aumentares a capacidade.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold tracking-tight">
                                {remainingLeads === 1 ? 'Apenas 1 lead' : `${remainingLeads} leads`} até ao limite deste imóvel
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Aumenta a capacidade antes de perderes candidatos.
                              </p>
                            </>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {extraLeadPrice !== null && (
                            <button
                              onClick={() => setBuyLeadsOpen(true)}
                              className="text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/85 rounded-xl px-3.5 py-2 transition-all"
                            >
                              Comprar leads
                            </button>
                          )}
                          <button
                            onClick={() => navigate('/onboarding/upgrade')}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-background hover:bg-muted rounded-xl px-3.5 py-2 transition-all"
                          >
                            Fazer upgrade
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {propertyCandidates.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                      <p className="text-sm text-muted-foreground">Nenhum candidato encontrado com os filtros actuais.</p>
                    </div>
                  ) : (
                    <>
                      <motion.div layout className="space-y-2.5">
                        <AnimatePresence>
                          {paginatedCandidates.map(c => (
                            <LeadCard
                              key={c.id}
                              candidate={c}
                              property={filteredProperties.find(p => p.id === c.propertyId)}
                              onClick={() => openCandidate(c)}
                              onApprove={c.status === 'new' ? () => handleStatusChange(c.id, 'approved') : undefined}
                              onReject={c.status === 'new' ? () => handleStatusChange(c.id, 'rejected') : undefined}
                              onSchedule={c.status === 'approved' ? () => navigate('/appointments', { state: { preSelectLeadId: c.id } }) : undefined}
                              onReschedule={c.status === 'visit_cancelled' ? () => navigate('/appointments', { state: { preSelectLeadId: c.id } }) : undefined}
                              onComplete={c.status === 'visit_scheduled' ? () => handleComplete(c.id) : undefined}
                              onContract={c.status === 'visit_finished' ? () => handleContract(c.id) : undefined}
                              onRevertContract={c.status === 'contracted' ? () => handleRevertContract(c.id) : undefined}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>

                      {/* Pagination */}
                      {candidatesTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 pb-10">
                          <p className="text-xs text-muted-foreground">
                            {(candidatesPage - 1) * CANDIDATES_PAGE_SIZE + 1}–{Math.min(candidatesPage * CANDIDATES_PAGE_SIZE, propertyCandidates.length)} de {propertyCandidates.length} candidatos
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCandidatesPage(p => Math.max(1, p - 1))}
                              disabled={candidatesPage === 1}
                              className="h-8 w-8 flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                              aria-label="Página anterior"
                            >
                              ‹
                            </button>
                            {Array.from({ length: candidatesTotalPages }, (_, i) => i + 1)
                              .filter(pg =>
                                pg === 1 ||
                                pg === candidatesTotalPages ||
                                Math.abs(pg - candidatesPage) <= 1
                              )
                              .reduce<(number | '…')[]>((acc, pg, idx, arr) => {
                                if (idx > 0 && pg - (arr[idx - 1] as number) > 1) acc.push('…');
                                acc.push(pg);
                                return acc;
                              }, [])
                              .map((pg, idx) =>
                                pg === '…' ? (
                                  <span key={`ellipsis-${idx}`} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground select-none">…</span>
                                ) : (
                                  <button
                                    key={pg}
                                    onClick={() => setCandidatesPage(pg as number)}
                                    className={`h-8 w-8 flex items-center justify-center rounded-xl text-xs font-medium transition-all ${
                                      candidatesPage === pg
                                        ? 'bg-accent text-accent-foreground shadow-sm'
                                        : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                  >
                                    {pg}
                                  </button>
                                )
                              )
                            }
                            <button
                              onClick={() => setCandidatesPage(p => Math.min(candidatesTotalPages, p + 1))}
                              disabled={candidatesPage === candidatesTotalPages}
                              className="h-8 w-8 flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                              aria-label="Próxima página"
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      )}
                      {candidatesTotalPages <= 1 && <div className="pb-10" />}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <AddPropertyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refreshProperties} />

      {editOpen && editingPropertyDto && (
        <EditPropertyDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          property={editingPropertyDto}
          onSaved={(saved) => { setEditingPropertyDto(saved); refreshProperties(); }}
        />
      )}

      <LeadDetailSheet
        candidate={selectedCandidate}
        property={candidateProperty}
        scoringConfig={scoringConfig}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {extraLeadPrice !== null && (
        <BuyLeadsDialog
          open={buyLeadsOpen}
          onOpenChange={setBuyLeadsOpen}
          onUpdated={refreshLeads}
        />
      )}
      </div>{/* end relative wrapper */}
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

