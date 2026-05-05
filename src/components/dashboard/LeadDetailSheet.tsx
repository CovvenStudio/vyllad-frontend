import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
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
  const { t } = useTranslation(['dashboard', 'common']);
  if (!candidate || !property) return null;

  const URGENCY_COLOR: Record<string, string> = {
    immediate: 'text-emerald-500',
    soon: 'text-amber-500',
    flexible: 'text-muted-foreground',
  };

  const rentalPrice = property.rentalPrice ?? property.price ?? 0;
  const incomeRatio = rentalPrice > 0 ? (candidate.monthlyIncome / rentalPrice).toFixed(1) : '—';
  const urgencyColor = URGENCY_COLOR[candidate.urgency ?? 'flexible'] ?? 'text-muted-foreground';

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
    if (candidate.score >= 80 && candidate.urgency === 'immediate') return t('dashboard:insights.excellentUrgent');
    if (candidate.score >= 80) return t('dashboard:insights.excellent');
    if (candidate.score >= 60 && candidate.urgency === 'immediate') return t('dashboard:insights.goodUrgent');
    if (d1 < 30) return t('dashboard:insights.incomeLow');
    if (d3 < 40) return t('dashboard:insights.guaranteeLow');
    if (candidate.score >= 60) return t('dashboard:insights.reasonable');
    return t('dashboard:insights.low');
  })();

  const whyText = (() => {
    const parts: string[] = [];
    if (d1 >= 80) parts.push(t('dashboard:detailSheet.whyText.financeSolid'));
    else if (d1 < 40) parts.push(t('dashboard:detailSheet.whyText.financeWeak'));
    if (d2 >= 80) parts.push(t('dashboard:detailSheet.whyText.jobStable'));
    else if (d2 < 40) parts.push(t('dashboard:detailSheet.whyText.jobRisk'));
    if (d3 >= 90) parts.push(t('dashboard:detailSheet.whyText.guaranteesAbove'));
    else if (d3 < 50) parts.push(t('dashboard:detailSheet.whyText.guaranteesInsufficient'));
    if (candidate.urgency === 'immediate') parts.push(t('dashboard:detailSheet.whyText.moveNow'));
    else if (candidate.urgency === 'flexible') parts.push(t('dashboard:detailSheet.whyText.noUrgency'));
    return parts.length ? parts.join(' · ') : t('dashboard:detailSheet.whyText.medium');
  })();

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b">
          <SheetHeader>
            <SheetTitle className="sr-only">{t('dashboard:detailSheet.title')}</SheetTitle>
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
                  {candidate.status === 'visit_scheduled' ? t('common:status.visitScheduled') :
                   candidate.status === 'approved' ? t('common:status.approved') :
                   candidate.classification === 'excellent' ? t('dashboard:priority.contactNow') :
                   candidate.classification === 'potential' ? t('dashboard:priority.evaluate') : t('dashboard:priority.deprioritize')}
                </span>
                {candidate.status !== 'approved' && candidate.status !== 'visit_scheduled' && (
                  <span className={`text-xs font-medium ${urgencyColor}`}>
                    <Timer className="w-3 h-3 inline mr-0.5" />{t(`dashboard:detailSheet.urgency.${candidate.urgency ?? 'flexible'}`)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">{t('dashboard:detailSheet.diagnosis')}</p>
            <p className="text-sm font-medium">{insight}</p>
            <p className="text-xs text-muted-foreground mt-1">{whyText}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('dashboard:detailSheet.scoreSection')}</h3>
            {scoringConfig && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg"
                onClick={() => setXRayOpen(true)}>
                <ScanSearch className="w-3.5 h-3.5" />
                {t('dashboard:xray.title')}
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <ScoreBar label={t('dashboard:detailSheet.scores.d1')} value={d1} color="bg-emerald-500" />
            <ScoreBar label={t('dashboard:detailSheet.scores.d2')} value={d2} color="bg-violet-500" />
            <ScoreBar label={t('dashboard:detailSheet.scores.d3')} value={d3} color="bg-blue-500" />
            <ScoreBar label={t('dashboard:detailSheet.scores.d4')} value={d4} color="bg-amber-500" />
          </div>
        </div>

        {/* Profile */}
        <div className="p-6 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">{t('dashboard:detailSheet.title')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { Icon: TrendingUp, label: t('dashboard:detailSheet.income'), value: `€${candidate.monthlyIncome.toLocaleString('pt-PT')}/mês` },
              { Icon: Target, label: t('dashboard:detailSheet.incomeRatio'), value: `${incomeRatio}×` },
              { Icon: Users, label: t('dashboard:detailSheet.people'), value: t('dashboard:detailSheet.people', { count: candidate.numberOfPeople }) },
              { Icon: PawPrint, label: t('dashboard:detailSheet.pets'), value: candidate.hasPets ? (candidate.petDetails || t('common:yesNo.yes')) : t('common:yesNo.no') },
              { Icon: Briefcase, label: t('dashboard:detailSheet.job'), value: t(`dashboard:detailSheet.employment.${candidate.employmentType}`, { defaultValue: candidate.employmentType }) },
              { Icon: Clock, label: t('dashboard:detailSheet.jobDuration'), value: candidate.employmentDuration >= 12 ? t('dashboard:detailSheet.jobDuration_years', { count: Math.floor(candidate.employmentDuration / 12) }) : t('dashboard:detailSheet.jobDuration_months', { count: candidate.employmentDuration }) },
              { Icon: CheckCircle2, label: t('dashboard:detailSheet.guarantor'), value: candidate.hasGuarantor ? t('common:yesNo.yes') : t('common:yesNo.no') },
              { Icon: CalendarCheck, label: t('dashboard:detailSheet.availability'), value: candidate.moveInTimeline ? tScreeningOption(candidate.moveInTimeline) : '—' },
              ...(candidate.nationality ? [{ Icon: Globe, label: t('dashboard:detailSheet.nationality'), value: getCountryName(candidate.nationality) }] : []),
              ...(candidate.residencyDuration ? [{ Icon: MapPin, label: t('dashboard:detailSheet.residency'), value: tScreeningOption(candidate.residencyDuration) }] : []),
              ...(candidate.stayDuration ? [{ Icon: Timer, label: t('dashboard:detailSheet.stayDuration'), value: tScreeningOption(candidate.stayDuration) }] : []),
              ...(candidate.hasVisited ? [{ Icon: Eye, label: t('dashboard:detailSheet.hasVisited'), value: tScreeningOption(candidate.hasVisited) }] : []),
              ...(candidate.motivation ? [{ Icon: Target, label: t('dashboard:detailSheet.motivation'), value: tScreeningOption(candidate.motivation) }] : []),
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('dashboard:detailSheet.customQuestions')}</p>
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
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">{t('dashboard:detailSheet.contact')}</h3>
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
                <CheckCircle2 className="w-4 h-4 mr-2" /> {t('dashboard:detailSheet.actions.approve')}
              </Button>
              <Button variant="outline" className="w-full h-11 font-semibold rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => { onStatusChange(candidate.id, 'rejected'); onClose(); }}>
                <XCircle className="w-4 h-4 mr-2" /> {t('dashboard:detailSheet.actions.reject')}
              </Button>
            </>
          )}
          {candidate.status === 'approved' && (
            <>
              <Button className="w-full h-11 font-semibold rounded-xl"
                onClick={() => { onClose(); navigate('/appointments', { state: { preSelectLeadId: candidate.id } }); }}>
                <CalendarCheck className="w-4 h-4 mr-2" /> {t('dashboard:detailSheet.actions.schedule')}
              </Button>
              <Button variant="outline" className="w-full h-11 rounded-xl"
                disabled={sendingEmail || !candidate.visitToken}
                onClick={async () => {
                  if (!currentAgencyId) return;
                  setSendingEmail(true);
                  try {
                    await sendVisitLink(currentAgencyId, candidate.id);
                    toast({ title: t('dashboard:detailSheet.actions.linkSent'), description: `Link de visita enviado para ${candidate.email}.` });
                  } catch (err) {
                    monitoring.captureException(err, { context: 'send-visit-link' });
                    toast({ title: t('dashboard:detailSheet.actions.linkError'), variant: 'destructive' });
                  } finally {
                    setSendingEmail(false);
                  }
                }}>
                {sendingEmail
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Send className="w-4 h-4 mr-2" />}
                {sendingEmail ? t('dashboard:detailSheet.actions.sendingLink') : t('dashboard:detailSheet.actions.sendLink')}
              </Button>
            </>
          )}
          {(candidate.status === 'visit_scheduled') && candidate.scheduledVisit && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('dashboard:detailSheet.actions.visitConfirmed')}</p>
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
