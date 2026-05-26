import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import placeholderImg from '@/assets/details/img1.jpg';
import {
  ArrowLeft, MapPin, Users, Trophy, Eye, Pencil, ExternalLink,
  LayoutDashboard, CalendarCheck, CheckCircle2, XCircle, PawPrint,
  BedDouble, Bath, Ruler, Building2, Car, Timer, Star, Lock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PageSplash from '@/components/dashboard/PageSplash';
import EditPropertyDialog from '@/components/dashboard/EditPropertyDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getProperty } from '@/lib/properties-api';
import type { PropertyDto } from '@/lib/properties-api';
import { listLeads } from '@/lib/leads-api';
import type { LeadDto } from '@/lib/leads-api';

// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PropertyDto['status'], { dot: string; cls: string }> = {
  ACTIVE:   { dot: 'bg-emerald-400', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAUSED:   { dot: 'bg-amber-400',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  RENTED:   { dot: 'bg-blue-400',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ARCHIVED: { dot: 'bg-slate-400',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const CLASS_CONFIG = {
  excellent: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  potential: { ring: 'ring-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  low:       { ring: 'ring-slate-200',   bg: 'bg-slate-100',  text: 'text-slate-400' },
};

function fmtDays(d: number) {
  if (d === 0) return '< 1d';
  if (d < 30) return `${d}d`;
  const m = Math.floor(d / 30), r = d % 30;
  return r === 0 ? `${m}m` : `${m}m ${r}d`;
}

// ── Small info card (Roofstock style) ──────────────────────────────────────────
function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/60 p-3.5 min-h-[74px] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider leading-none">{label}</span>
      </div>
      <p className="text-base font-bold text-foreground leading-tight mt-1">
        {value ?? <span className="text-muted-foreground/30 text-sm font-normal">—</span>}
      </p>
    </div>
  );
}

// ── Bottom metric strip card ──────────────────────────────────────────────────
function MetricStrip({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 px-6 py-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${accent ? 'text-primary' : 'text-muted-foreground/50'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">{label}</span>
      </div>
      <p className={`text-2xl font-display font-700 leading-none ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground leading-snug">{sub}</p>}
    </div>
  );
}

// ── Candidate row ──────────────────────────────────────────────────────────────
function CandidateRow({ lead, i }: { lead: LeadDto; i: number }) {
  const { t } = useTranslation('common');
  const cls = CLASS_CONFIG[lead.classification];
  const statusKey = lead.status.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.035 }}
      className="flex items-center gap-3 py-2.5 px-1 border-b border-border/40 last:border-0"
    >
      <div className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center shrink-0 ${cls.bg} ${cls.ring}`}>
        <span className={`font-display font-700 text-xs leading-none ${cls.text}`}>{lead.score}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
        <p className="text-xs text-muted-foreground">{t(`common:status.${statusKey}`, lead.status)}</p>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {lead.urgency === 'immediate' && (
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">{t('properties:badge.urgent')}</span>
        )}
        {lead.status === 'contracted' && <Trophy className="w-3.5 h-3.5 text-violet-500" />}
        {lead.status === 'visit_scheduled' && <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAgencyId, memberships } = useAuth();
  const currentAgencySlug = memberships.find(m => m.agencyId === currentAgencyId)?.agencySlug ?? '';
  const { t } = useTranslation(['properties', 'common']);

  const [property, setProperty] = useState<PropertyDto | null>(null);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [planLimit, setPlanLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!currentAgencyId || !id) return;
    setLoading(true);
    Promise.all([
      getProperty(currentAgencyId, id),
      listLeads(currentAgencyId, id, 0, 200),
    ])
      .then(([prop, lr]) => {
        setProperty(prop);
        setLeads(lr.leads);
        setHiddenCount(lr.hiddenCount ?? 0);
        setPlanLimit(lr.planLimit ?? null);
      })
      .catch(() => navigate('/properties'))
      .finally(() => setLoading(false));
  }, [currentAgencyId, id, navigate]);

  const activeLeads  = useMemo(() => leads.filter(l => l.status !== 'rejected'), [leads]);
  const contracted   = useMemo(() => leads.filter(l => l.status === 'contracted'), [leads]);
  const visitLeads   = useMemo(() => leads.filter(l => ['visit_scheduled','visit_cancelled','visit_finished','contracted'].includes(l.status)), [leads]);
  const hasContract  = contracted.length > 0;
  const lastContract = contracted[contracted.length - 1];
  const topLeads     = useMemo(() => [...activeLeads].sort((a, b) => b.score - a.score), [activeLeads]);

  const avgDaysToClose = useMemo(() => {
    if (!property) return null;
    const c = leads.filter(l => l.status === 'contracted' && l.contractedAt);
    if (!c.length) return null;
    const base = new Date(property.createdAt).getTime();
    return Math.round(c.reduce((s, l) => s + new Date(l.contractedAt!).getTime() - base, 0) / c.length / 86400000);
  }, [property, leads]);

  const daysSince = useMemo(() =>
    property ? Math.floor((Date.now() - new Date(property.createdAt).getTime()) / 86400000) : null,
    [property]
  );

  const scfg     = property ? STATUS_CONFIG[property.status] : null;
  const isActive = property?.status === 'ACTIVE' || property?.status === 'PAUSED';
  const hero     = property?.images?.[imgIdx] ?? property?.images?.[0];

  if (loading) return <DashboardLayout><PageSplash label={t('properties:detail.loading')} /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7]">

        {/* ─── TOP NAV BAR ──────────────────────────────────────────────── */}
        <div className="bg-white border-b border-border/60 px-6 md:px-8 h-14 flex items-center justify-between gap-4 sticky top-0 z-30">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('properties:detail.back')}</span>
          </button>

          {!loading && property && (
            <p className="text-sm font-semibold text-foreground truncate hidden md:block">{property.title}</p>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {property?.slug && (
              <a
                href={`/${currentAgencySlug}/property/${property.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 bg-white text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> {t('properties:detail.viewPage')}
              </a>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 bg-white text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> {t('properties:detail.edit')}
            </button>
            {isActive && (
              <button
                onClick={() => navigate('/dashboard', { state: { propertyId: property?.id } })}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> {t('properties:detail.dashboard')}
              </button>
            )}
          </div>
        </div>

        {/* ─── MAIN SPLIT LAYOUT ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-0 min-h-[calc(100vh-3.5rem-120px)]">

          {/* ══ LEFT PANEL — property info ═════════════════════════════════ */}
          <div className="bg-[#F4F5F7] p-6 md:p-8 overflow-y-auto">

            {/* Heading */}
            <div className="mb-5">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-64 rounded" />
                  <Skeleton className="h-4 w-40 rounded" />
                </div>
              ) : property ? (
                <>
                  <h1 className="text-xl font-display font-700 tracking-tight text-foreground mb-1">
                    {t('properties:detail.info')}
                  </h1>
                  {scfg && (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${scfg.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                      {t(`properties:status.${property.status}`)}
                    </span>
                  )}
                </>
              ) : null}
            </div>

            {/* ── Location card ── */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-border/60 p-4 mb-5 h-[80px] space-y-2">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-5 w-48 rounded" />
              </div>
            ) : property?.location ? (
              <div className="bg-white rounded-2xl border border-border/60 p-4 mb-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.location')}</p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{property.location}</p>
                </div>
              </div>
            ) : null}

            {/* Details */}
            {!loading && property && (
              <div className="mb-5">
                  <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.available')}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {property.availableFrom ? new Date(property.availableFrom).toLocaleDateString('pt-PT') : 'Imediatamente'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.reference')}</p>
                        <p className="text-sm font-semibold text-foreground font-mono">{property.referenceId ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.pets')}</p>
                        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${property.criteria.petsAllowed ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
                          {property.criteria.petsAllowed
                            ? <><PawPrint className="w-3.5 h-3.5" />{property.criteria.allowedPetTypes.length > 0 ? property.criteria.allowedPetTypes.join(', ') : t('properties:detail.petsAllowed')}</>
                            : <><XCircle className="w-3.5 h-3.5" />{t('properties:detail.petsNotAllowed')}</>}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.createdAt')}</p>
                        <p className="text-sm font-semibold text-foreground">{new Date(property.createdAt).toLocaleDateString('pt-PT')}</p>
                      </div>
                    </div>
                    {property.announcementLink && (
                      <div className="pt-3 border-t border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-1">{t('properties:detail.announcementLink')}</p>
                        <a href={property.announcementLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline truncate max-w-full">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{property.announcementLink}</span>
                        </a>
                      </div>
                    )}
                    {property.description && (
                      <div className="pt-3 border-t border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-1.5">{t('properties:detail.description')}</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
                      </div>
                    )}
                  </div>
              </div>
            )}

            {/* ── Criteria card ── */}
            {!loading && property && (
              <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-muted-foreground/50" />
                  {t('properties:detail.criteriaTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.minIncome')}</p>
                    <p className="text-sm font-bold text-foreground">€{property.criteria.minIncome.toLocaleString('pt-PT')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.maxPeople')}</p>
                    <p className="text-sm font-bold text-foreground">{property.criteria.maxPeople}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.advance')}</p>
                    <p className="text-sm font-bold text-foreground">{property.criteria.advanceMonths} {t('properties:detail.months')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.deposit')}</p>
                    <p className="text-sm font-bold text-foreground">{property.criteria.depositMonths} {t('properties:detail.months')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:criteria.guarantor')}</p>
                    <span className={`text-sm font-bold ${property.criteria.guarantorRequired ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {property.criteria.guarantorRequired ? t('properties:detail.guarantorRequired') : t('properties:detail.guarantorNotRequired')}
                    </span>
                  </div>
                  {property.criteria.advanceWithoutGuarantor != null && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.advanceNoGuarantor')}</p>
                      <p className="text-sm font-bold text-foreground">{property.criteria.advanceWithoutGuarantor} {t('properties:detail.months')}</p>
                    </div>
                  )}
                  {property.criteria.depositWithoutGuarantor != null && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.depositNoGuarantor')}</p>
                      <p className="text-sm font-bold text-foreground">{property.criteria.depositWithoutGuarantor} {t('properties:detail.months')}</p>
                    </div>
                  )}
                  {property.criteria.minContractMonths && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{t('properties:detail.minContract')}</p>
                      <p className="text-sm font-bold text-foreground">{property.criteria.minContractMonths} {t('properties:detail.months')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT PANEL — photo + candidates ══════════════════════════ */}
          <div className="relative bg-[#F4F5F7] p-6 md:p-8 flex flex-col gap-5">

            {/* ── Photo area with floating card ── */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)]" style={{ height: '380px' }}>
              {loading ? (
                <Skeleton className="w-full h-full rounded-none" />
              ) : hero ? (
                <motion.img
                  key={hero}
                  src={hero}
                  alt=""
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  {/* Placeholder background photo */}
                  <img
                    src={placeholderImg}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/55" />
                  {/* Centered logo + label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="font-display text-4xl font-700 tracking-tight text-white drop-shadow-lg">vyllad</span>
                      <span className="text-4xl font-700 drop-shadow-lg" style={{ color: '#c9a96e' }}>.</span>
                    </div>
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.18em]">{t('properties:detail.illustrative')}</p>
                  </div>
                </div>
              )}

              {/* Floating info card (Roofstock style) */}
              {!loading && property && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-white/80 p-4 w-52"
                >
                  <div className="mb-2.5">
                      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">{t('properties:detail.location')}</p>
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                      {property.location ?? property.title}
                      {property.referenceId && <span className="font-mono text-[10px] text-muted-foreground/50 ml-1">{property.referenceId}</span>}
                    </p>
                  </div>
                  <div className="border-t border-border/50 pt-2.5">
                      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">{t('properties:detail.price')}</p>
                    <p className="text-xl font-display font-700 text-foreground leading-none">
                      €{property.rentalPrice.toLocaleString('pt-PT')}
                    </p>
                  </div>
                  {scfg && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${scfg.dot}`} />
                      <span className={`text-[11px] font-bold ${STATUS_CONFIG[property.status].cls.split(' ')[2]}`}>{t(`properties:status.${property.status}`)}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Thumbnail strip bottom-left */}
              {!loading && property && property.images.length > 1 && (
                <div className="absolute bottom-4 left-4 flex gap-1.5">
                  {property.images.slice(0, 4).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${
                        imgIdx === i ? 'border-white scale-110 shadow-lg' : 'border-white/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {property.images.length > 4 && (
                    <div className="w-10 h-10 rounded-xl bg-black/50 border-2 border-white/40 flex items-center justify-center text-[10px] font-bold text-white">
                      +{property.images.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Candidates panel ── */}
            <div className="bg-white rounded-2xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground/50" />
                  {t('properties:detail.activeCandidates')}
                  {!loading && (
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{activeLeads.length}</span>
                  )}
                </h2>
                {isActive && !loading && (
                  <button
                    onClick={() => navigate('/dashboard', { state: { propertyId: property?.id } })}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                  >
                    <LayoutDashboard className="w-3 h-3" /> {t('properties:detail.manage')}
                  </button>
                )}
              </div>

              <div className="px-4 py-2 max-h-[240px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-0">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-3.5 w-28 rounded" />
                          <Skeleton className="h-2.5 w-20 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topLeads.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{t('properties:detail.noCandidates')}</p>
                  </div>
                ) : (
                  topLeads.slice(0, 8).map((l, i) => <CandidateRow key={l.id} lead={l} i={i} />)
                )}
              </div>

              {!loading && topLeads.length > 0 && (
                <div className="px-5 py-3 border-t border-border/40 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    {leads.filter(l => l.classification === 'excellent').length} {t('properties:candidates.excellent', { count: leads.filter(l => l.classification === 'excellent').length })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {leads.filter(l => l.classification === 'potential').length} {t('properties:candidates.potential', { count: leads.filter(l => l.classification === 'potential').length })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                    {leads.filter(l => l.classification === 'low').length} {t('properties:candidates.low', { count: leads.filter(l => l.classification === 'low').length })}
                  </div>
                </div>
              )}

              {/* ── Plan upsell banner ── */}
              {!loading && hiddenCount > 0 && (
                <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-800 leading-snug">
                      {t('properties:upsell.title', { count: hiddenCount })}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {t('properties:upsell.desc', { limit: planLimit })}
                    </p>
                    <button
                      onClick={() => navigate('/billing')}
                      className="mt-2 text-[11px] font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900 transition-colors"
                    >
                    {t('properties:upsell.link')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ─── METRIC STRIP (full width, below fold) ─────────────────────── */}
        <div className="bg-white border-t border-b border-border/60">
          <div className="flex divide-x divide-border/60 overflow-x-auto">

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-1 px-6 py-4 space-y-2 min-w-[160px]">
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <Skeleton className="h-7 w-16 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              ))
            ) : (
              <>
                <MetricStrip
                  icon={Users}
                  label={t('properties:detail.activeCandidates')}
                  value={activeLeads.length}
                  accent={activeLeads.length > 0}
                />
                <MetricStrip
                  icon={CalendarCheck}
                  label={t('properties:detail.tabs.visits')}
                  value={visitLeads.length}
                  sub={`${leads.filter(l => l.status === 'visit_scheduled').length} marcadas · ${leads.filter(l => l.status === 'visit_finished').length} realizadas`}
                />
                <MetricStrip
                  icon={Trophy}
                  label={t('properties:detail.tabs.contract')}
                  value={hasContract ? t('properties:detail.closed') : t('properties:detail.open')}
                  sub={hasContract && lastContract
                    ? `${lastContract.name}${lastContract.contractedAt ? ' · ' + new Date(lastContract.contractedAt).toLocaleDateString('pt-PT') : ''}`
                    : leads.filter(l => l.status === 'visit_finished').length > 0 ? t('properties:detail.visitCompleted') : t('properties:detail.accepting')}
                  accent={hasContract}
                />
                <MetricStrip
                  icon={Timer}
                  label={avgDaysToClose !== null ? t('properties:metrics.avgToClose') : t('properties:metrics.capturedSince')}
                  value={avgDaysToClose !== null ? fmtDays(avgDaysToClose) : daysSince !== null ? fmtDays(daysSince) : '—'}
                  sub={avgDaysToClose !== null
                    ? `média de ${contracted.length} contrato${contracted.length === 1 ? '' : 's'}`
                    : property ? `desde ${new Date(property.createdAt).toLocaleDateString('pt-PT')}` : ''}
                />
              </>
            )}
          </div>
        </div>

      </div>

      {property && (
        <EditPropertyDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          property={property}
          onSaved={updated => setProperty(updated)}
        />
      )}
    </DashboardLayout>
  );
}
