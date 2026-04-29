import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Mail, Calendar, Users, PawPrint, Briefcase, Clock,
  TrendingUp, Timer, Target, CheckCircle2, XCircle, CalendarCheck, ScanSearch, Send, Loader2,
  Globe, MapPin, Eye, MessageSquare,
} from 'lucide-react';
import { tScreeningOption } from '@/lib/screening-i18n';
import { Candidate, Property } from '@/lib/types';
import { motion } from 'framer-motion';
import type { ScoringConfigDto } from '@/lib/leads-api';
import { sendVisitLink } from '@/lib/leads-api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LeadXRayDialog from './LeadXRayDialog';

interface LeadDetailSheetProps {
  candidate: Candidate | null;
  property: Property | null;
  scoringConfig: ScoringConfigDto | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: Candidate['status']) => void;
}

function getCountryName(code: string): string {
  if (!code) return '';
  try { return new Intl.DisplayNames(['pt'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

const employmentLabel: Record<string, string> = {
  permanent: 'Contrato sem termo',
  contract: 'Contrato a prazo',
  freelancer: 'Independente',
  student: 'Estudante',
  retired: 'Reformado',
  other: 'Outro',
};

const urgencyLabel: Record<string, { label: string; color: string }> = {
  immediate: { label: 'Urgente', color: 'text-emerald-500' },
  soon: { label: 'Em breve', color: 'text-amber-500' },
  flexible: { label: 'Flexível', color: 'text-muted-foreground' },
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function ScoreRing({ score, classification }: { score: number; classification: Candidate['classification'] }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = classification === 'excellent' ? '#22c55e' : classification === 'potential' ? '#f59e0b' : '#94a3b8';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/40" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="font-display text-2xl font-700 leading-none">{score}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">score</div>
      </div>
    </div>
  );
}

export default function LeadDetailSheet({ candidate, property, scoringConfig, open, onClose, onStatusChange }: LeadDetailSheetProps) {
  const [xRayOpen, setXRayOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();
  const { currentAgencyId } = useAuth();
  const { toast } = useToast();
  if (!candidate || !property) return null;

  const rentalPrice = property.rentalPrice ?? property.price ?? 0;
  const incomeRatio = rentalPrice > 0 ? (candidate.monthlyIncome / rentalPrice).toFixed(1) : '—';
  const urgency = urgencyLabel[candidate.urgency ?? 'flexible'];

  const d1 = candidate.factorScores
    ? Math.round(((candidate.factorScores.incomeRatio ?? 0) + (candidate.factorScores.commitments ?? 0)) / 2)
    : 0;
  const d2 = candidate.factorScores
    ? Math.round(((candidate.factorScores.jobType ?? 0) + (candidate.factorScores.employmentDuration ?? 0)) / 2)
    : 0;
  const d3 = candidate.factorScores
    ? Math.round(((candidate.factorScores.guarantor ?? 0) + (candidate.factorScores.household ?? 0) + (candidate.factorScores.pets ?? 0)) / 3)
    : 0;
  const d4 = candidate.factorScores
    ? Math.round(((candidate.factorScores.urgency ?? 0) + (candidate.factorScores.stayDuration ?? 0) + (candidate.factorScores.hasVisited ?? 0) + (candidate.factorScores.motivation ?? 0)) / 4)
    : 0;

  const insight = (() => {
    if (candidate.score >= 80 && candidate.urgency === 'immediate') return 'Perfil excelente · pronto para fechar';
    if (candidate.score >= 80) return 'Excelente perfil financeiro e laboral';
    if (candidate.score >= 60 && candidate.urgency === 'immediate') return 'Bom perfil · alta urgência de mudança';
    if (d1 < 30) return 'Rendimento abaixo do mínimo recomendado';
    if (d3 < 40) return 'Garantias insuficientes para este imóvel';
    if (candidate.score >= 60) return 'Perfil razoável · sem urgência imediata';
    return 'Baixa compatibilidade com os critérios';
  })();

  const whyText = (() => {
    const parts: string[] = [];
    if (d1 >= 80) parts.push('capacidade financeira sólida');
    else if (d1 < 40) parts.push('capacidade financeira abaixo do ideal');
    if (d2 >= 80) parts.push('estabilidade laboral elevada');
    else if (d2 < 40) parts.push('risco laboral elevado');
    if (d3 >= 90) parts.push('garantias acima do exigido');
    else if (d3 < 50) parts.push('garantias insuficientes');
    if (candidate.urgency === 'immediate') parts.push('pronto para se mudar agora');
    else if (candidate.urgency === 'flexible') parts.push('sem urgência de mudança');
    return parts.length ? parts.join(' · ') : 'Perfil com compatibilidade média com este imóvel';
  })();

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b">
          <SheetHeader>
            <SheetTitle className="sr-only">Detalhe do candidato</SheetTitle>
          </SheetHeader>
          <div className="flex items-start gap-5">
            <ScoreRing score={candidate.score} classification={candidate.classification} />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-display text-xl font-700 tracking-tight leading-tight">{candidate.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{property.title}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                    candidate.status === 'visit_scheduled'
                      ? 'border-blue-200 bg-blue-50 text-blue-600'
                      : candidate.status === 'approved'
                      ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600'
                      : 'border-border/60 bg-card'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    candidate.status === 'visit_scheduled' ? 'bg-blue-500' :
                    candidate.status === 'approved' ? 'bg-emerald-500' :
                    candidate.classification === 'excellent' ? 'bg-emerald-500' :
                    candidate.classification === 'potential' ? 'bg-amber-400' : 'bg-muted-foreground/40'
                  }`} />
                  {candidate.status === 'visit_scheduled' ? 'Visita marcada' :
                   candidate.status === 'approved' ? 'Aprovado' :
                   candidate.classification === 'excellent' ? 'Contactar agora' :
                   candidate.classification === 'potential' ? 'Avaliar' : 'Desprioritizar'}
                </span>
                {candidate.status !== 'approved' && candidate.status !== 'visit_scheduled' && (
                  <span className={`text-xs font-medium ${urgency.color}`}>
                    <Timer className="w-3 h-3 inline mr-0.5" />{urgency.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">Diagnóstico</p>
            <p className="text-sm font-medium">{insight}</p>
            <p className="text-xs text-muted-foreground mt-1">{whyText}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Análise de pontuação</h3>
            {scoringConfig && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg"
                onClick={() => setXRayOpen(true)}>
                <ScanSearch className="w-3.5 h-3.5" />
                Raio-X
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <ScoreBar label="D1 · Capacidade Financeira" value={d1} color="bg-emerald-500" />
            <ScoreBar label="D2 · Perfil de Risco" value={d2} color="bg-violet-500" />
            <ScoreBar label="D3 · Garantias" value={d3} color="bg-blue-500" />
            <ScoreBar label="D4 · Fit e Intenção" value={d4} color="bg-amber-500" />
          </div>
        </div>

        {/* Profile */}
        <div className="p-6 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">Perfil</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { Icon: TrendingUp, label: 'Rendimento', value: `€${candidate.monthlyIncome.toLocaleString('pt-PT')}/mês` },
              { Icon: Target, label: 'Rácio renda', value: `${incomeRatio}×` },
              { Icon: Users, label: 'Pessoas', value: `${candidate.numberOfPeople} pessoa${candidate.numberOfPeople > 1 ? 's' : ''}` },
              { Icon: PawPrint, label: 'Animais', value: candidate.hasPets ? (candidate.petDetails || 'Sim') : 'Não' },
              { Icon: Briefcase, label: 'Situação', value: employmentLabel[candidate.employmentType] ?? candidate.employmentType },
              { Icon: Clock, label: 'Na função há', value: candidate.employmentDuration >= 12 ? `${Math.floor(candidate.employmentDuration / 12)} ano(s)` : `${candidate.employmentDuration} meses` },
              { Icon: CheckCircle2, label: 'Fiador', value: candidate.hasGuarantor ? 'Sim' : 'Não' },
              { Icon: CalendarCheck, label: 'Disponibilidade', value: candidate.moveInTimeline ? tScreeningOption(candidate.moveInTimeline) : '—' },
              ...(candidate.nationality ? [{ Icon: Globe, label: 'Nacionalidade', value: getCountryName(candidate.nationality) }] : []),
              ...(candidate.residencyDuration ? [{ Icon: MapPin, label: 'Reside há', value: tScreeningOption(candidate.residencyDuration) }] : []),
              ...(candidate.stayDuration ? [{ Icon: Timer, label: 'Tempo pretendido', value: tScreeningOption(candidate.stayDuration) }] : []),
              ...(candidate.hasVisited ? [{ Icon: Eye, label: 'Já visitou imóveis?', value: tScreeningOption(candidate.hasVisited) }] : []),
              ...(candidate.motivation ? [{ Icon: Target, label: 'Motivação', value: tScreeningOption(candidate.motivation) }] : []),
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40">
                <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-xs font-semibold mt-0.5">{value}</div>
                </div>
              </div>
            ))}
          </div>
          {candidate.customAnswers && Object.keys(candidate.customAnswers).length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Perguntas personalizadas</p>
              {Object.entries(candidate.customAnswers).map(([q, a]) => (
                <div key={q} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">{q}</div>
                    <div className="text-xs font-semibold mt-0.5">{a || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {candidate.notes && (
            <div className="mt-3 p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground italic">
              "{candidate.notes}"
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="p-6 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">Contacto</h3>
          <div className="space-y-2.5">
            <a href={`tel:${candidate.phone}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-muted/50 transition-colors group">
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm">{candidate.phone}</span>
            </a>
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-muted/50 transition-colors group">
              <Mail className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm">{candidate.email}</span>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 space-y-2.5">
          {candidate.status === 'new' && (
            <>
              <Button className="w-full h-11 font-semibold rounded-xl"
                onClick={() => { onStatusChange(candidate.id, 'approved'); onClose(); }}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar candidato
              </Button>
              <Button variant="outline" className="w-full h-11 font-semibold rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => { onStatusChange(candidate.id, 'rejected'); onClose(); }}>
                <XCircle className="w-4 h-4 mr-2" /> Rejeitar
              </Button>
            </>
          )}
          {candidate.status === 'approved' && (
            <>
              <Button className="w-full h-11 font-semibold rounded-xl"
                onClick={() => { onClose(); navigate('/appointments', { state: { preSelectLeadId: candidate.id } }); }}>
                <CalendarCheck className="w-4 h-4 mr-2" /> Agendar visita
              </Button>
              <Button variant="outline" className="w-full h-11 rounded-xl"
                disabled={sendingEmail || !candidate.visitToken}
                onClick={async () => {
                  if (!currentAgencyId) return;
                  setSendingEmail(true);
                  try {
                    await sendVisitLink(currentAgencyId, candidate.id);
                    toast({ title: 'Email enviado!', description: `Link de visita enviado para ${candidate.email}.` });
                  } catch {
                    toast({ title: 'Erro ao enviar email', variant: 'destructive' });
                  } finally {
                    setSendingEmail(false);
                  }
                }}>
                {sendingEmail
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Send className="w-4 h-4 mr-2" />}
                Enviar link de visita
              </Button>
            </>
          )}
          {(candidate.status === 'visit_scheduled') && candidate.scheduledVisit && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Visita confirmada</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(candidate.scheduledVisit).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {scoringConfig && (
      <LeadXRayDialog
        open={xRayOpen}
        onClose={() => setXRayOpen(false)}
        candidate={candidate}
        property={property}
        scoringConfig={scoringConfig}
      />
    )}
  </>
  );
}
