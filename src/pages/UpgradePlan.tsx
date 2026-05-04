import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, ArrowLeft, Star, BarChart3, Link2, Calendar, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlans } from '@/plans';
import { useBillingCountries } from '@/billing-countries/useBillingCountries';
import { BillingCountrySelect } from '@/billing-countries/BillingCountrySelect';
import type { BillingCountry } from '@/billing-countries/useBillingCountries';
import type { Plan, PlanId } from '@/plans';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StepConfirm } from '@/components/onboarding/StepConfirm';

// ─── Feature icon helper ───────────────────────────────────────────────────────

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'Score': <Star className="w-3 h-3" />,
  'AI': <Zap className="w-3 h-3" />,
  'Analytics': <BarChart3 className="w-3 h-3" />,
  'Magic': <Link2 className="w-3 h-3" />,
  'Agendamento': <Calendar className="w-3 h-3" />,
};

function getFeatureIcon(feature: string) {
  for (const [key, icon] of Object.entries(FEATURE_ICONS)) {
    if (feature.includes(key)) return icon;
  }
  return <Check className="w-3 h-3" />;
}

// ─── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  billingCountry,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  billingCountry: BillingCountry | null;
  onSelect: (plan: Plan) => void;
}) {
  const { t } = useTranslation('billing');
  const translatedBadge = plan.badge ? t(`plans.${plan.id}.badge`) : null;
  const translatedFeatures = t(`plans.${plan.id}.features`, { returnObjects: true }) as string[];
  const marketEntry = billingCountry && plan.marketPrices
    ? plan.marketPrices.find((mp) => mp.market === billingCountry.market) ?? null
    : null;
  const displayPrice = marketEntry !== null ? marketEntry.price : plan.price;
  const currency = billingCountry?.currency ?? 'EUR';
  const currencySymbol = currency === 'BRL' ? 'R$' : '€';

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22 }}
      onClick={() => onSelect(plan)}
      className={cn(
        'relative w-full h-full text-left rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
        selected
          ? 'border-foreground bg-card shadow-lg ring-2 ring-foreground/10'
          : plan.highlighted
          ? 'border-foreground/30 bg-card hover:border-foreground/60'
          : 'border-border bg-card hover:border-foreground/30',
      )}
    >
      {translatedBadge && (
        <span className={cn(
          'absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap',
          plan.highlighted ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
        )}>
          {translatedBadge}
        </span>
      )}

      <div>
        <p className="font-display text-base font-700 tracking-tight">{t(`plans.${plan.id}.name`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`plans.${plan.id}.tagline`)}</p>
      </div>

      <div className="flex items-baseline gap-1">
        {plan.billing === 'contact' ? (
          <span className="font-display text-xl font-600">{t('plan.contact')}</span>
        ) : (
          <>
            <span className="font-display text-3xl font-700 tracking-tight">{currencySymbol}{displayPrice}</span>
            <span className="text-xs text-muted-foreground">{t('plan.perMonth')}</span>
          </>
        )}
      </div>

      {plan.id !== 'scale' && (
        <div className="flex flex-col divide-y divide-border/60 py-2 border-y border-border/60">
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('plan.properties')}</p>
            <p className="font-display text-sm font-700">{plan.limits.properties ?? '∞'}</p>
          </div>
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('plan.candidatesPerProperty')}</p>
            <p className="font-display text-sm font-700">{plan.limits.candidatesPerProperty ?? '∞'}</p>
          </div>
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('plan.agents')}</p>
            <p className="font-display text-sm font-700">{plan.limits.agents ?? '∞'}</p>
          </div>
        </div>
      )}

      <ul className="space-y-1.5 flex-1">
        {translatedFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-accent shrink-0">{getFeatureIcon(f)}</span>
            {f}
          </li>
        ))}
      </ul>

      {/* Extra lead pricing */}
      {plan.id !== 'trial' && plan.id !== 'scale' && (() => {
        const extraPrice = marketEntry?.extraLeadPrice ?? null;
        if (!extraPrice) return null;
        const sym = currency === 'BRL' ? 'R$' : '€';
        const units = plan.extraLeadsPerUnit ?? 1;
        return (
          <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Zap className="w-3 h-3 text-accent shrink-0" />
            <span>
              {t('plan.extraLeadsLabel')}: <span className="font-semibold text-foreground">{sym}{extraPrice}</span>
              {units > 1 ? ` ${t('plan.perLeads', { count: units })}` : ` ${t('plan.perLead')}`}
            </span>
          </div>
        );
      })()}

      <div className={cn(
        'h-9 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-200',
        selected
          ? 'bg-foreground text-background'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted',
      )}>
        {t(`plans.${plan.id}.cta`)}
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </motion.button>
  );
}
// ─── Page ──────────────────────────────────────────────────────────────────────

export default function UpgradePlan() {
  const navigate = useNavigate();
  const { memberships, currentAgencyId, subscription, refreshSession } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation(['billing', 'common']);
  const { plans, loading: plansLoading } = usePlans();
  const { countries, loading: countriesLoading } = useBillingCountries();

  const [billingCountry, setBillingCountry] = useState<BillingCountry | null>(null);
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [confirming, setConfirming] = useState(false);

  const currentMembership = memberships.find((m) => m.agencyId === currentAgencyId) ?? null;
  const isOwner = currentMembership?.role === 'OWNER';

  // Upgrading = already has a subscription (trial or active)
  const isUpgrade = !!subscription;

  const isTrialExpired =
    subscription?.status === 'trialing' &&
    !!subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt).getTime() < Date.now();

  useEffect(() => {
    if (!isOwner) navigate('/dashboard', { replace: true });
  }, [isOwner]);

  useEffect(() => {
    if (!billingCountry && countries.length > 0) {
      // For upgrades, lock to the agency's stored country code; otherwise default to PT
      const agencyCode = isUpgrade ? (currentMembership?.agencyCountryCode ?? 'PT') : 'PT';
      const match = countries.find((c) => c.countryCode === agencyCode) ?? countries.find((c) => c.countryCode === 'PT') ?? countries[0];
      setBillingCountry(match);
    }
  }, [countries, billingCountry, isUpgrade, currentMembership?.agencyCountryCode]);

  const paidPlans = plans.filter((p) => p.id !== 'trial');

  const handleSelectPlan = (plan: Plan) => {
    setPendingPlan(plan);
    setStep('review');
  };

  const handleConfirm = useCallback(async () => {
    if (!pendingPlan || confirming) return;
    setConfirming(true);
    try {
      const { stripeCheckoutUrl } = await apiFetch<{ stripeCheckoutUrl: string | null }>('/onboarding/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          planId: pendingPlan.backendPlanId,
          billingMarket: billingCountry?.market ?? null,
          billingCurrency: billingCountry?.currency ?? null,
          locale: i18n.language,
        }),
      });
      if (stripeCheckoutUrl) {
        window.location.href = stripeCheckoutUrl;
      } else {
        // In-place upgrade (existing Stripe sub updated) — refresh auth and go to billing
        await refreshSession();
        navigate('/billing', { replace: true });
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('billing:upgrade.errorCheckout'), variant: 'destructive' });
      setConfirming(false);
    }
  }, [pendingPlan, confirming, billingCountry, refreshSession, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={step === 'review' ? () => setStep('select') : () => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'review' ? t('billing:upgrade.changePlan') : t('billing:upgrade.back')}
          </button>
          <div className="flex items-center gap-1">
            <span className="font-display text-xl font-700 tracking-tight">vyllad</span>
            <span className="text-accent text-xl">.</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-5xl">
        {isTrialExpired && step === 'select' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3.5 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">{t('billing:upgrade.trialExpiredTitle')}</p>
              <p className="text-muted-foreground mt-0.5">
                {t('billing:upgrade.trialExpiredDesc')}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mb-8">
                <h1 className="font-display text-3xl font-700 tracking-tight mb-2">{t('billing:upgrade.title')}</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('billing:upgrade.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <span className="text-sm text-muted-foreground">{t('billing:upgrade.billingCountry')}:</span>
                {isUpgrade ? (
                  <span className="text-sm font-medium">
                    {billingCountry?.name ?? '—'}
                    <span className="ml-1.5 text-xs text-muted-foreground">({billingCountry?.currency})</span>
                  </span>
                ) : (
                  <BillingCountrySelect
                    countries={countries}
                    value={billingCountry}
                    onChange={setBillingCountry}
                    loading={countriesLoading}
                  />
                )}
              </div>

              {plansLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('billing:upgrade.loading')}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                  {paidPlans.map((plan) => (
                    <div key={plan.id} className="h-full">
                      <PlanCard
                        plan={plan}
                        selected={pendingPlan?.id === plan.id}
                        billingCountry={billingCountry}
                        onSelect={handleSelectPlan}
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <StepConfirm
              selectedPlanId={pendingPlan!.id as PlanId}
              agency={{ name: currentMembership?.agencyName ?? '', county: '', district: '' }}
              billingCountry={billingCountry}
              onConfirm={handleConfirm}
              onBack={() => setStep('select')}
              submitting={confirming}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
