import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus, Search, Home, MoreHorizontal, Pencil, PauseCircle, PlayCircle,
  Archive, KeyRound, MapPin, BedDouble, Ruler,
  ChevronLeft, ChevronRight, Users, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PageSplash from '@/components/dashboard/PageSplash';
import AddPropertyDialog from '@/components/dashboard/AddPropertyDialog';
import EditPropertyDialog from '@/components/dashboard/EditPropertyDialog';
import { useProperties } from '@/hooks/useProperties';
import type { PropertyDto } from '@/lib/properties-api';
import { listLeadsByAgency } from '@/lib/leads-api';
import { useAuth } from '@/contexts/AuthContext';
import { usePlans } from '@/plans';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';

// ── Status className config (labels are now t('properties:status.X')) ────────
const STATUS_CLASSNAME: Record<PropertyDto['status'], string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED:   'bg-amber-50 text-amber-700 border-amber-200',
  RENTED:   'bg-blue-50 text-blue-700 border-blue-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
};

// ── Candidate count badge ─────────────────────────────────────────────────────
function CandidateCount({ count, loading }: { count: number; loading: boolean }) {
  if (loading) return <span className="inline-block w-10 h-4 rounded bg-muted animate-pulse" />;
  if (count === 0) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
      count >= 10 ? 'bg-violet-50 text-violet-700 border-violet-200' :
      count >= 5  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-muted text-muted-foreground border-border/60'
    }`}>
      <Users className="w-3 h-3" />
      {count}
    </span>
  );
}

// ── Property row ──────────────────────────────────────────────────────────────
function PropertyRow({
  property,
  index,
  candidateCount,
  leadsLoading,
  onEdit,
  onSetStatus,
}: {
  property: PropertyDto;
  index: number;
  candidateCount: number;
  leadsLoading: boolean;
  onEdit: (p: PropertyDto) => void;
  onSetStatus: (id: string, status: PropertyDto['status']) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation(['properties', 'common']);
  const statusClassName = STATUS_CLASSNAME[property.status];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      {/* Property name + image */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-muted ring-1 ring-border/60">
            {property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="w-4 h-4 text-muted-foreground/50" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{property.title}</p>
            {property.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                <MapPin className="w-3 h-3 shrink-0" />
                {property.location}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Reference ID */}
      <td className="px-4 py-3.5">
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
          {property.referenceId ?? `#${property.id.slice(0, 6).toUpperCase()}`}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusClassName}`}>
          {t(`properties:status.${property.status}`)}
        </span>
      </td>

      {/* Price */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-foreground">
          €{property.rentalPrice.toLocaleString('pt-PT')}
        </span>
        <span className="text-xs text-muted-foreground">/mês</span>
      </td>

      {/* Details */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          {property.area ? (
            <span className="flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              {property.area} m²
            </span>
          ) : null}
          {property.bedrooms ? (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" />
              {property.bedrooms} qts
            </span>
          ) : null}
          {!property.area && !property.bedrooms && (
            <span className="text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* Candidatos */}
      <td className="px-4 py-3.5">
        <CandidateCount count={candidateCount} loading={leadsLoading} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onEdit(property)} className="gap-2">
              <Pencil className="w-3.5 h-3.5" /> {t('properties:actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {property.status === 'ACTIVE' ? (
              <DropdownMenuItem onClick={() => onSetStatus(property.id, 'PAUSED')} className="gap-2">
                <PauseCircle className="w-3.5 h-3.5" /> {t('properties:actions.pause')}
              </DropdownMenuItem>
            ) : property.status === 'PAUSED' ? (
              <DropdownMenuItem onClick={() => onSetStatus(property.id, 'ACTIVE')} className="gap-2">
                <PlayCircle className="w-3.5 h-3.5" /> {t('properties:actions.resume')}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 text-destructive focus:text-destructive data-[state=open]:text-destructive">
                <Archive className="w-3.5 h-3.5" /> {t('properties:actions.close')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuItem onClick={() => onSetStatus(property.id, 'RENTED')} className="gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> {t('properties:actions.rented')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetStatus(property.id, 'ARCHIVED')}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Archive className="w-3.5 h-3.5" /> {t('properties:actions.archived')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-36 rounded" />
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-md" /></td>
      <td className="px-4 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-4 py-3.5"><Skeleton className="h-4 w-24 rounded" /></td>
      <td className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded" /></td>
      <td className="px-4 py-3.5"><Skeleton className="h-2 w-28 rounded-full" /></td>
      <td className="px-4 py-3.5"><Skeleton className="h-7 w-7 rounded-lg" /></td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function Imoveis() {
  const { currentAgencyId, user, memberships } = useAuth();
  const isOwner = (memberships.find(m => m.agencyId === currentAgencyId)?.role ?? '') === 'OWNER';
  const navigate = useNavigate();
  const { t } = useTranslation(['properties', 'common']);
  const { properties, loading, setStatus, refresh: refreshProperties } = useProperties();
  const { plans } = usePlans();
  const userPlan = plans.find(p => p.backendPlanId === user?.planId);
  const maxProperties = userPlan?.limits.properties ?? null;
  const activeCount = properties.filter(p => p.status === 'ACTIVE').length;
  const atLimit = maxProperties !== null && activeCount >= maxProperties;
  const { toast } = useToast();

  async function handleSetStatus(id: string, status: PropertyDto['status']) {
    try {
      await setStatus(id, status);
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'PLAN_PROPERTY_LIMIT_REACHED') {
        toast({
          variant: 'destructive',
          title: t('properties:limitReached.title'),
          description: t('properties:limitReached.desc', { count: maxProperties }),
        });
      } else {
        toast({ variant: 'destructive', title: t('common:errors.generic'), description: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Fetch all leads once to compute per-property candidate counts
  useEffect(() => {
    if (!currentAgencyId) return;
    setLeadsLoading(true);
    listLeadsByAgency(currentAgencyId, undefined, 0, 1000)
      .then(res => {
        const counts: Record<string, number> = {};
        for (const lead of res.leads) {
          if (lead.status !== 'rejected') {
            counts[lead.propertyId] = (counts[lead.propertyId] ?? 0) + 1;
          }
        }
        setCandidateCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLeadsLoading(false));
  }, [currentAgencyId]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyDto | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PropertyDto['status'] | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return properties.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.location?.toLowerCase().includes(q) && !p.referenceId?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [properties, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleStatusFilter(v: string) {
    setStatusFilter(v as PropertyDto['status'] | 'ALL');
    setPage(1);
  }

  function openEdit(p: PropertyDto) {
    setEditingProperty(p);
    setEditOpen(true);
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: properties.length, ACTIVE: 0, PAUSED: 0, RENTED: 0, ARCHIVED: 0 };
    properties.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return counts;
  }, [properties]);

  if (loading) return <DashboardLayout><PageSplash label={t('properties:loading')} /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between mb-6 gap-4"
        >
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-700 tracking-tight text-foreground">{t('properties:title')}</h1>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2 flex-wrap">
              {t('properties:totalCount', { count: properties.length })}
              {maxProperties !== null && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  activeCount >= maxProperties
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : activeCount / maxProperties >= 0.8
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}>
                  <Home className="w-2.5 h-2.5" />
                  {activeCount} / {maxProperties} ativos
                </span>
              )}
            </p>
          </div>
          {atLimit ? (
            isOwner ? (
            <Button
              onClick={() => navigate('/onboarding/upgrade')}
              className="gap-1.5 rounded-full font-semibold shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('properties:upgrade')}
            </Button>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">{t('properties:contactOwnerUpgrade')}</span>
            )
          ) : (
            <Button
              onClick={() => setAddOpen(true)}
              className="gap-2 rounded-full font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('properties:addProperty')}</span>
            </Button>
          )}
        </motion.div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center gap-3 mb-5"
        >
          {/* Status quick-filter pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/70 ring-1 ring-border/60">
            {([
              ['ALL', t('properties:filter.all')],
              ['ACTIVE', t('properties:filter.active')],
              ['PAUSED', t('properties:filter.paused')],
              ['RENTED', t('properties:filter.rented')],
              ['ARCHIVED', t('properties:filter.archived')],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleStatusFilter(value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  statusFilter === value
                    ? 'bg-background shadow text-foreground ring-1 ring-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
                {statusCounts[value] > 0 && (
                  <span className={`ml-1.5 text-[10px] ${statusFilter === value ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    {statusCounts[value]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder={t('properties:searchPlaceholder')}
              className="pl-8 h-9 text-sm rounded-full border-border/60 bg-background"
            />
          </div>
        </motion.div>

        {/* ── Table card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border bg-card overflow-hidden shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.property')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.reference')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.price')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.details')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('properties:table.candidates')}
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="bg-card">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                          <Home className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('properties:noProperties')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {search || statusFilter !== 'ALL'
                              ? t('properties:noPropertiesFilter')
                              : t('properties:noPropertiesHint')}
                          </p>
                        </div>
                        {!search && statusFilter === 'ALL' && (
                          atLimit ? (
                            isOwner ? (
                            <Button size="sm" onClick={() => navigate('/onboarding/upgrade')} className="gap-1.5 rounded-full mt-1 font-semibold bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-sm">
                              <Sparkles className="w-3 h-3" />
                              {t('properties:upgrade')}
                            </Button>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">{t('properties:contactOwnerUpgrade')}</p>
                            )
                          ) : (
                            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2 rounded-full mt-1">
                              <Plus className="w-3.5 h-3.5" /> {t('properties:addProperty')}
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p, i) => (
                    <PropertyRow
                      key={p.id}
                      property={p}
                      index={i}
                      candidateCount={candidateCounts[p.id] ?? 0}
                      leadsLoading={leadsLoading}
                      onEdit={openEdit}
                      onSetStatus={handleSetStatus}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────────────────── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {t('properties:pagination.showing', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '...' ? (
                      <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`h-7 w-7 text-xs rounded-lg font-semibold transition-all ${
                          page === n
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <AddPropertyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refreshProperties} />
      {editingProperty && (
        <EditPropertyDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          property={editingProperty}
        />
      )}
    </DashboardLayout>
  );
}
