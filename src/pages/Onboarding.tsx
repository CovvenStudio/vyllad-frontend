import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronDown, Loader2, Building2, MapPin, Users, FileText, Zap, BarChart3, Link2, Calendar, Star, Clock, SendHorizonal, Mail } from 'lucide-react';
import { StepConfirm } from '@/components/onboarding/StepConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePlans } from '@/plans';
import { useOnboarding } from '@/onboarding';
import { useBillingCountries } from '@/billing-countries/useBillingCountries';
import { BillingCountrySelect } from '@/billing-countries/BillingCountrySelect';
import type { BillingCountry } from '@/billing-countries/useBillingCountries';
import type { AgencySetup } from '@/onboarding';
import type { Plan, PlanId } from '@/plans';
import { useAuth } from '@/contexts/AuthContext';
import { requestTrial } from '@/lib/auth-api';

// ─── Portugal Districts ───────────────────────────────────────────────────────
const PORTUGAL_DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 'Porto',
  'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
  'Região Autónoma dos Açores', 'Região Autónoma da Madeira',
];

// ─── Brazilian States ─────────────────────────────────────────────────────────
const BRAZIL_STATES = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará',
  'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão',
  'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará',
  'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro',
  'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima',
  'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
];

// ─── Step Indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'plan', label: 'Plano' },
  { key: 'agency', label: 'Imobiliária' },
  { key: 'confirm', label: 'Confirmação' },
];

function StepIndicator({ current }: { current: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-12">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300',
            i < currentIdx && 'text-muted-foreground',
            i === currentIdx && 'bg-foreground text-background',
            i > currentIdx && 'text-muted-foreground/40',
          )}>
            {i < currentIdx ? (
              <Check className="w-3 h-3" />
            ) : (
              <span className={cn(
                'w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold',
                i === currentIdx ? 'border-background bg-background text-foreground' : 'border-current'
              )}>{i + 1}</span>
            )}
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'w-8 h-px mx-1 transition-colors duration-300',
              i < currentIdx ? 'bg-muted-foreground/40' : 'bg-border'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

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

// Move useSearchParams and useEffect to the main component (likely Onboarding)

function PlanCard({
  plan,
  selected,
  onSelect,
  billingCountry,
  trialRequestedAt,
  trialAllowedAt,
  onRequestTrial,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: (plan: Plan) => void;
  billingCountry: BillingCountry | null;
  trialRequestedAt?: string | null;
  trialAllowedAt?: string | null;
  onRequestTrial?: () => void;
}) {
  const isTrial = plan.id === 'trial';
  const isScale = plan.id === 'scale';

  // Trial gate states
  const trialApproved = isTrial && !!trialAllowedAt;
  const trialPending  = isTrial && !!trialRequestedAt && !trialAllowedAt;
  const trialLocked   = isTrial && !trialRequestedAt && !trialAllowedAt;
  const isDisabled    = trialPending;

  // Resolve display price from marketPrices or fallback to base price
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
      whileHover={isDisabled || trialLocked ? {} : { y: -2 }}
      transition={{ duration: 0.25 }}
      onClick={() => !isDisabled && !trialLocked && onSelect(plan)}
      disabled={isDisabled}
      className={cn(
        'relative w-full h-full text-left rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDisabled
          ? 'border-border bg-card/50 opacity-70 cursor-not-allowed'
          : trialLocked
          ? 'border-dashed border-accent/40 bg-card/50 cursor-default'
          : selected
          ? 'border-foreground bg-card shadow-lg'
          : plan.highlighted
          ? 'border-foreground/30 bg-card hover:border-foreground/60'
          : 'border-border bg-card hover:border-foreground/30',
        isTrial && 'border-dashed',
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <span className={cn(
          'absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap',
          plan.highlighted
            ? 'bg-foreground text-background'
            : isTrial
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted text-muted-foreground',
        )}>
          {plan.badge}
        </span>
      )}

      {/* Header */}
      <div>
        <p className="font-display text-base font-700 tracking-tight">{plan.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        {plan.billing === 'contact' ? (
          <span className="font-display text-xl font-600">Contactar</span>
        ) : isTrial ? (
          <>
            <span className="font-display text-3xl font-700 tracking-tight">Grátis</span>
            <span className="text-xs text-muted-foreground">/ {plan.limits.trialDays} dias</span>
          </>
        ) : (
          <>
            <span className="font-display text-3xl font-700 tracking-tight">{currencySymbol}{displayPrice}</span>
            <span className="text-xs text-muted-foreground">/mês</span>
          </>
        )}
      </div>

      {/* Limits summary */}
      {!isScale && (
        <div className="grid grid-cols-3 divide-x divide-border/60 py-3 border-y border-border/60">
          <div className="flex flex-col items-center justify-between gap-1 px-6">
            <p className="font-display text-lg font-700 leading-none">{plan.limits.properties ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">imóveis</p>
          </div>
          <div className="flex flex-col items-center justify-between gap-1 px-6">
            <p className="font-display text-lg font-700 leading-none">{plan.limits.candidatesPerProperty ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">cand./imóvel</p>
          </div>
          <div className="flex flex-col items-center justify-between gap-1 px-6">
            <p className="font-display text-lg font-700 leading-none">{plan.limits.agents ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">agentes</p>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-accent shrink-0">{getFeatureIcon(f)}</span>
            {f}
          </li>
        ))}
      </ul>

      {/* Selection indicator */}
      {trialPending ? (
        <div className="h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Aguarda aprovação
        </div>
      ) : trialLocked ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRequestTrial?.(); }}
          className="h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium w-full bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer"
        >
          <SendHorizonal className="w-3 h-3" />
          Solicitar Trial
        </button>
      ) : (
        <div className={cn(
          'h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-200',
          selected
            ? 'bg-foreground text-background'
            : 'bg-muted/60 text-muted-foreground',
        )}>
          {selected ? (
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3" /> Selecionado</span>
          ) : (
            plan.cta
          )}
        </div>
      )}
    </motion.button>
  );
}

// ─── Step 1 — Plan Selection ──────────────────────────────────────────────────
function StepPlan({
  billingCountry,
  onBillingCountryChange,
  onSelect,
}: {
  billingCountry: BillingCountry | null;
  onBillingCountryChange: (c: BillingCountry) => void;
  onSelect: (plan: Plan) => void;
}) {
  const { plans, loading } = usePlans();
  const { countries, loading: countriesLoading } = useBillingCountries();
  const { user } = useAuth();
  const [hovered, setHovered] = useState<PlanId | null>(null);
  const [trialRequesting, setTrialRequesting] = useState(false);
  const [trialRequested, setTrialRequested] = useState(false);
  const [showTrialSuccess, setShowTrialSuccess] = useState(false);

  // Compute live trial state (local optimistic update if just requested)
  const trialRequestedAt = trialRequested ? new Date().toISOString() : (user?.trialRequestedAt ?? null);
  const trialAllowedAt   = user?.trialAllowedAt ?? null;

  // Default to Portugal, fall back to first country
  useEffect(() => {
    if (!billingCountry && countries.length > 0) {
      const pt = countries.find((c) => c.countryCode === 'PT') ?? countries[0];
      onBillingCountryChange(pt);
    }
  }, [countries, billingCountry, onBillingCountryChange]);

  const handleRequestTrial = useCallback(async () => {
    if (trialRequesting) return;
    setTrialRequesting(true);
    try {
      await requestTrial();
      setTrialRequested(true);
      setShowTrialSuccess(true);
    } catch (err) {
      console.error('[requestTrial]', err);
    } finally {
      setTrialRequesting(false);
    }
  }, [trialRequesting]);

  return (
    <div>
      {/* ─── Trial Success Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {showTrialSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="w-full max-w-md text-center space-y-6"
            >
              {/* Logo */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="font-display text-xl tracking-tight text-foreground">vyllad</span>
                <span className="text-accent text-xl">.</span>
              </div>

              {/* Success icon */}
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="h-10 w-10 text-emerald-600" />
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="font-display text-2xl tracking-tight text-foreground">
                  Pedido enviado com sucesso!
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O teu acesso trial está quase aqui — só precisamos de validar o teu pedido.
                </p>
              </div>

              {/* Details card */}
              <div className="rounded-xl border border-border bg-card p-5 text-left space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  A nossa equipa vai analisar o teu pedido e entrar em contacto em breve.
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  Durante o trial terás acesso completo à plataforma — imóveis, triagem automática e relatórios.
                </p>
                <p className="text-sm font-medium text-accent">
                  Normalmente aprovamos em menos de 24 horas. ⚡
                </p>
              </div>

              {/* Email notice */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Vais receber um email quando o acesso for ativado.
              </div>

              {/* Back button */}
              <button
                onClick={() => setShowTrialSuccess(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar aos planos
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="font-display text-3xl font-700 tracking-tight mb-2">
        Escolha o seu plano
      </h1>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        Todos os planos incluem triagem automática de candidatos.<br />
        Pode alterar ou cancelar a qualquer momento.
      </p>

      {/* Billing country selector */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-sm text-muted-foreground">País de faturação:</span>
        <BillingCountrySelect
          countries={countries}
          value={billingCountry}
          onChange={onBillingCountryChange}
          loading={countriesLoading}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">A carregar planos…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="h-full"
              onMouseEnter={() => setHovered(plan.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <PlanCard
                plan={plan}
                selected={hovered === plan.id}
                onSelect={onSelect}
                billingCountry={billingCountry}
                trialRequestedAt={plan.id === 'trial' ? trialRequestedAt : undefined}
                trialAllowedAt={plan.id === 'trial' ? trialAllowedAt : undefined}
                onRequestTrial={plan.id === 'trial' ? handleRequestTrial : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — Agency Setup ────────────────────────────────────────────────────
function StepAgency({
  initial,
  billingCountry,
  onSubmit,
  onBack,
}: {
  initial: AgencySetup;
  billingCountry: BillingCountry | null;
  onSubmit: (data: AgencySetup) => void;
  onBack: () => void;
}) {
  const isBR = billingCountry?.countryCode === 'BR';
  const isPT = !billingCountry || billingCountry.countryCode === 'PT';

  const regionLabel  = isPT ? 'Distrito'   : isBR ? 'Estado'  : 'Região';
  const cityLabel    = isPT ? 'Concelho'   : isBR ? 'Cidade'  : 'Cidade';
  const regionPlaceholder = isPT ? 'Selecione o distrito' : isBR ? 'Selecione o estado' : 'Região';
  const cityPlaceholder   = isPT ? 'Ex: Lisboa'           : isBR ? 'Ex: São Paulo'       : 'Cidade';
  const useSelectForRegion = isPT || isBR;
  const regionOptions = isPT ? PORTUGAL_DISTRICTS : isBR ? BRAZIL_STATES : [];

  const [form, setForm] = useState<AgencySetup>(initial);

  // Sync country/countryCode into form and reset district when billing country changes
  useEffect(() => {
    if (!billingCountry) return;
    setForm((p) => ({
      ...p,
      district: '',
      country: billingCountry.name,
      countryCode: billingCountry.countryCode,
    }));
  }, [billingCountry?.countryCode, billingCountry]);

  const valid = form.name.trim().length > 0 && form.county.trim().length > 0 && form.district.length > 0;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!valid) return;
      onSubmit(form);
    },
    [form, valid, onSubmit],
  );

  return (
    <div className="max-w-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="font-display text-3xl font-700 tracking-tight mb-2">
        Configure a sua imobiliária
      </h1>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        Isto ajuda a personalizar os critérios de qualificação para a sua região.
      </p>

      {/* Selected country badge */}
      {billingCountry && (
        <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-muted/60 w-fit text-sm text-muted-foreground">
          {billingCountry.flagEmoji && <span className="text-base leading-none">{billingCountry.flagEmoji}</span>}
          <span>{billingCountry.name}</span>
          <span className="text-xs opacity-60">{billingCountry.currency}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="agency-name" className="text-sm font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            Nome da imobiliária
          </Label>
          <Input
            id="agency-name"
            placeholder="Ex: Ribeiro & Associados"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="h-11 rounded-xl"
            autoFocus
          />
        </div>

        {/* Region field — select for PT/BR, free text for others */}
        <div className="space-y-1.5">
          <Label htmlFor="agency-district" className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            {regionLabel}
          </Label>
          {useSelectForRegion ? (
            <div className="relative">
              <select
                id="agency-district"
                value={form.district}
                onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                className={cn(
                  'w-full h-11 rounded-xl border border-input bg-background px-3 pr-10 text-sm appearance-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
                  'transition-colors',
                  !form.district && 'text-muted-foreground',
                )}
              >
                <option value="" disabled>{regionPlaceholder}</option>
                {regionOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          ) : (
            <Input
              id="agency-district"
              placeholder={regionPlaceholder}
              value={form.district}
              onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
              className="h-11 rounded-xl"
            />
          )}
        </div>

        {/* City field */}
        <div className="space-y-1.5">
          <Label htmlFor="agency-county" className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            {cityLabel}
          </Label>
          <Input
            id="agency-county"
            placeholder={cityPlaceholder}
            value={form.county}
            onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
            className="h-11 rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={!valid}
          className="w-full h-11 rounded-xl font-medium mt-2"
        >
          Continuar
        </Button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { step, selectedPlanId, agency, billingCountry, submitting, selectPlan, selectBillingCountry, submitAgency, goBack, confirm } =
    useOnboarding();

  const { memberships, refreshSession, selectAgency } = useAuth();

  // Allow re-entry when ?new=1 is present (user wants to create another account/agency)
  const isNewAccount = searchParams.get('new') === '1';

  // If already onboarded (e.g. direct navigation) and not explicitly starting fresh, redirect
  useEffect(() => {
    if (memberships.length > 0 && !isNewAccount) {
      navigate('/dashboard', { replace: true });
    }
  }, [memberships, navigate, isNewAccount]);

  const handleConfirm = async () => {
    const { redirectedToStripe, agencyId } = await confirm();
    // Only navigate to dashboard if there was no Stripe redirect.
    // If redirected, the browser is already leaving — don't touch React Router.
    if (!redirectedToStripe) {
      // Refresh auth session so the new membership is visible, then switch to the new agency.
      await refreshSession();
      if (agencyId) selectAgency(agencyId);
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-display text-xl font-700 tracking-tight">vyllad</span>
            <span className="text-accent text-xl">.</span>
          </div>
          <span className="text-xs text-muted-foreground">Configuração inicial</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-5xl">
        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <StepPlan
                billingCountry={billingCountry}
                onBillingCountryChange={selectBillingCountry}
                onSelect={selectPlan}
              />
            </motion.div>
          )}

          {step === 'agency' && (
            <motion.div
              key="agency"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <StepAgency initial={agency} billingCountry={billingCountry} onSubmit={submitAgency} onBack={goBack} />
            </motion.div>
          )}

          {step === 'confirm' && selectedPlanId && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <StepConfirm
                selectedPlanId={selectedPlanId}
                agency={agency}
                billingCountry={billingCountry}
                onConfirm={handleConfirm}
                onBack={goBack}
                submitting={submitting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding;
