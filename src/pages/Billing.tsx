import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, ExternalLink, Loader2, Receipt, Download, FileText, Crown, Calendar, Info, Gauge, Minus, Plus, Check, Users, Building2, UserCheck } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionStatus {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete' | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planName: string | null;
  planMaxProperties: number | null;
  planMaxLeadsPerProperty: number | null;
  planMaxAgents: number | null;
  extraLeads: number;
  extraLeadsPerUnit: number | null;
  extraLeadPricePerUnit: number | null;
  extraLeadCurrency: string | null;
  supportsExtraLeads: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: string; // ISO date from backend
  hostedUrl: string | null;
  pdfUrl: string | null;
}

interface UpcomingInvoice {
  amount: number;          // cents
  currency: string;
  nextPaymentAt: string | null; // ISO datetime
  hasProration: boolean;
  prorationAmount: number; // cents (net, can be negative)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  // Force UTC so Stripe billing timestamps (e.g. 2026-05-28T23:00:00Z) don't
  // shift to the next calendar day in UTC+1 (Portugal summer time).
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(iso));
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  trialing: {
    label: 'Em Período de Teste',
    variant: 'secondary',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  active: {
    label: 'Ativa',
    variant: 'default',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  past_due: {
    label: 'Pagamento em Atraso',
    variant: 'destructive',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'Cancelada',
    variant: 'destructive',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  incomplete: {
    label: 'Incompleta',
    variant: 'outline',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'Paga',
  open: 'Em aberto',
  void: 'Anulada',
  uncollectible: 'Incobrável',
  draft: 'Rascunho',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Billing() {
  const { memberships, currentAgencyId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentMembership = memberships.find((m) => m.agencyId === currentAgencyId) ?? null;
  const isOwner = currentMembership?.role === 'OWNER';

  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Extra leads state
  const [extraLeadsQty, setExtraLeadsQty] = useState(0);
  const [savingLeads, setSavingLeads] = useState(false);
  const [savedLeads, setSavedLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) {
      navigate('/dashboard', { replace: true });
      return;
    }
    apiFetch<SubscriptionStatus>('/subscriptions/status')
      .then((data) => {
        setSubStatus(data);
        setExtraLeadsQty(data.extraLeads ?? 0);
        // Only fetch invoices if there's an active-ish subscription
        if (data.status && data.status !== 'trialing') {
          setInvoicesLoading(true);
          apiFetch<{ invoices: Invoice[]; upcoming: UpcomingInvoice | null }>('/subscriptions/invoices')
            .then((r) => { setInvoices(r.invoices); setUpcoming(r.upcoming ?? null); })
            .catch(() => {})
            .finally(() => setInvoicesLoading(false));
        }
      })
      .catch(() => {
        toast({ title: 'Erro ao carregar dados de subscrição', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [isOwner]);

  const handleUpgrade = () => navigate('/onboarding/upgrade');

  const handleSaveExtraLeads = async () => {
    setSavingLeads(true);
    setSavedLeads(false);
    setLeadsError(null);
    try {
      await apiFetch('/subscriptions/extra-leads', {
        method: 'PATCH',
        body: JSON.stringify({ quantity: extraLeadsQty }),
      });
      const updated = await apiFetch<SubscriptionStatus>('/subscriptions/status');
      setSubStatus(updated);
      setExtraLeadsQty(updated.extraLeads ?? 0);
      setSavedLeads(true);
    } catch (e) {
      setLeadsError(e instanceof Error ? e.message : 'Erro ao guardar leads extra.');
    } finally {
      setSavingLeads(false);
    }
  };

  const handleManagePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await apiFetch<{ url: string }>('/subscriptions/manage', { method: 'POST' });
      window.location.href = url;
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao abrir portal de faturação', variant: 'destructive' });
      setPortalLoading(false);
    }
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

  const statusCfg = subStatus?.status ? STATUS_CONFIG[subStatus.status] : null;
  const isTrial = subStatus?.status === 'trialing';
  const leadsPerUnit = subStatus?.extraLeadsPerUnit ?? 1;
  const pricePerLeadUnit = subStatus?.extraLeadPricePerUnit ?? 0;
  const leadCurrency = subStatus?.extraLeadCurrency ?? 'eur';
  const extraLeadsChanged = extraLeadsQty !== (subStatus?.extraLeads ?? 0);
  const trialDaysLeft = (() => {
    if (!subStatus?.trialEndsAt) return null;
    const diff = new Date(subStatus.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faturação</h1>
          <p className="text-sm text-muted-foreground mt-1">Detalhes do seu plano e subscrição</p>
        </div>

        {/* Subscription Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Subscrição atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subStatus ? (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="font-semibold text-lg">{subStatus.planName ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusCfg && (
                      <Badge variant={statusCfg.variant} className="flex items-center gap-1.5 px-2.5 py-1">
                        {statusCfg.icon}
                        {statusCfg.label}
                      </Badge>
                    )}
                    {subStatus.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUpgrade}
                        className="flex items-center gap-1.5 text-xs h-7 px-2.5"
                      >
                        <Crown className="w-3 h-3" />
                        {isTrial ? 'Subscrever' : 'Alterar plano'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  {subStatus.status === 'trialing' && subStatus.trialEndsAt && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Teste termina em</p>
                      <p className="text-sm font-medium">{formatDate(subStatus.trialEndsAt)}</p>
                    </div>
                  )}
                  {subStatus.currentPeriodEnd && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                        {subStatus.cancelAtPeriodEnd ? 'Acesso até' : 'Próxima renovação'}
                      </p>
                      <p className="text-sm font-medium">{formatDate(subStatus.currentPeriodEnd)}</p>
                    </div>
                  )}
                  {subStatus.cancelAtPeriodEnd && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        A subscrição está programada para ser cancelada no final do período atual.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Plan limits ──────────────────────────────────── */}
                {(subStatus.planMaxProperties != null || subStatus.planMaxLeadsPerProperty != null || subStatus.planMaxAgents != null) && (
                  <div className="border-t pt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {subStatus.planMaxAgents != null && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold">{subStatus.planMaxAgents}</span>
                        <span className="text-xs text-muted-foreground">agentes</span>
                      </div>
                    )}
                    {subStatus.planMaxProperties != null && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold">{subStatus.planMaxProperties}</span>
                        <span className="text-xs text-muted-foreground">imóveis ativos</span>
                      </div>
                    )}
                    {subStatus.planMaxLeadsPerProperty != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold">
                          {subStatus.planMaxLeadsPerProperty}
                          {subStatus.extraLeads > 0 && (
                            <span className="text-accent"> +{subStatus.extraLeads * (subStatus.extraLeadsPerUnit ?? 1)}</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">leads/imóvel{subStatus.extraLeads > 0 ? ' (+ extra)' : ''}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Extra leads stepper ───────────────────────────── */}
                {subStatus.supportsExtraLeads && subStatus.status === 'active' && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium">Leads extra por imóvel</p>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          máx. 50 · {formatMoney(Math.round(pricePerLeadUnit * 100), leadCurrency)}/pacote
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => { setExtraLeadsQty(q => Math.max(0, q - 1)); setSavedLeads(false); }}
                          disabled={extraLeadsQty === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <div className="text-center">
                          <span className="text-2xl font-bold">{extraLeadsQty}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {extraLeadsQty === 0
                              ? 'Sem leads extra'
                              : `${extraLeadsQty * leadsPerUnit} leads · ${formatMoney(Math.round(extraLeadsQty * pricePerLeadUnit * 100), leadCurrency)}/mês`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => { setExtraLeadsQty(q => Math.min(50, q + 1)); setSavedLeads(false); }}
                          disabled={extraLeadsQty >= 50}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {leadsError && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {leadsError}
                        </div>
                      )}

                      {savedLeads && !extraLeadsChanged && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          Leads extra guardados com sucesso.
                        </div>
                      )}

                      {extraLeadsChanged && (
                        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>A alteração é imediata. O valor será ajustado ao tempo restante do mês atual.</span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleSaveExtraLeads}
                          disabled={!extraLeadsChanged || savingLeads}
                          className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          {savingLeads ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5" />}
                          {savingLeads ? 'A guardar...' : 'Guardar alterações'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma subscrição encontrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Upgrade CTA — shown when trialing */}
        {isTrial && (
          <Card className={`border-2 ${trialDaysLeft !== null && trialDaysLeft <= 2 ? 'border-red-400 bg-red-50/40' : trialDaysLeft !== null && trialDaysLeft <= 5 ? 'border-amber-400 bg-amber-50/40' : 'border-primary/30 bg-primary/[0.03]'}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  trialDaysLeft !== null && trialDaysLeft <= 2 ? 'bg-red-100' : trialDaysLeft !== null && trialDaysLeft <= 5 ? 'bg-amber-100' : 'bg-primary/10'
                }`}>
                  <Crown className={`w-5 h-5 ${trialDaysLeft !== null && trialDaysLeft <= 2 ? 'text-red-600' : trialDaysLeft !== null && trialDaysLeft <= 5 ? 'text-amber-600' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm">
                    {trialDaysLeft === 0
                      ? 'O seu trial expirou hoje'
                      : trialDaysLeft === 1
                      ? 'Último dia de trial!'
                      : trialDaysLeft !== null && trialDaysLeft <= 5
                      ? `Apenas ${trialDaysLeft} dias restantes no trial`
                      : 'Está no período de teste'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trialDaysLeft !== null && trialDaysLeft <= 5
                      ? 'Subscreva agora para não perder o acesso à plataforma e manter todos os seus dados.'
                      : subStatus?.trialEndsAt
                      ? `O seu trial termina em ${formatDate(subStatus.trialEndsAt)}. Subscreva para continuar a usar o vyllad sem interrupções.`
                      : 'Subscreva para continuar a usar o vyllad sem interrupções.'}
                  </p>
                </div>
                <Button
                  onClick={handleUpgrade}
                  className={`shrink-0 flex items-center gap-2 ${
                    trialDaysLeft !== null && trialDaysLeft <= 2
                      ? 'bg-red-600 hover:bg-red-700'
                      : trialDaysLeft !== null && trialDaysLeft <= 5
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : ''
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  Subscrever agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próxima fatura */}
        {upcoming && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Próxima fatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Proration notice */}
              {upcoming.hasProration && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    Fizeste uma alteração de plano a meio do período de faturação. O valor abaixo já inclui o
                    <strong> ajuste ao tempo restante do ciclo atual</strong>.
                    Este montante será cobrado na próxima data de renovação.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Data de cobrança</p>
                  <p className="text-sm font-medium">{formatDate(upcoming.nextPaymentAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Valor</p>
                  <p className="text-xl font-semibold">{formatMoney(upcoming.amount, upcoming.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                Histórico de faturas
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManagePortal}
                disabled={portalLoading || !subStatus?.status}
                className="flex items-center gap-1.5 text-xs"
              >
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Gerir no Stripe
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma fatura disponível.</p>
            ) : (
              <div className="divide-y">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 py-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.number ?? inv.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(inv.created)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatMoney(inv.amountPaid || inv.amountDue, inv.currency)}</p>
                        <p className="text-xs text-muted-foreground">{INVOICE_STATUS_LABEL[inv.status ?? ''] ?? inv.status}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {inv.hostedUrl && (
                          <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-8 h-8" title="Ver fatura">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        {inv.pdfUrl && (
                          <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-8 h-8" title="Descarregar PDF">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

