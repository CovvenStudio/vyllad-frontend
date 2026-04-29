import { ChevronLeft, Loader2, Building2, FileText, Home, Users, UserCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlans } from '@/plans';
import type { PlanId } from '@/plans';
import type { AgencySetup } from '@/onboarding';
import type { BillingCountry } from '@/billing-countries/useBillingCountries';

export function StepConfirm({
  selectedPlanId,
  agency,
  billingCountry,
  onConfirm,
  onBack,
  submitting,
}: {
  selectedPlanId: PlanId;
  agency: AgencySetup;
  billingCountry: BillingCountry | null;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const { plans } = usePlans();
  const plan = plans.find((p) => p.id === selectedPlanId);

  if (!plan) return null;

  const isTrial = plan.id === 'trial';
  const isScale = plan.id === 'scale';

  const marketEntry = billingCountry && plan.marketPrices
    ? plan.marketPrices.find((mp) => mp.market === billingCountry.market) ?? null
    : null;
  const displayPrice = marketEntry !== null ? marketEntry.price : plan.price;
  const currencySymbol = billingCountry?.currency === 'BRL' ? 'R$' : '€';

  let buttonLabel = 'Confirmar e pagar';
  if (isTrial) buttonLabel = 'Experimentar grátis';
  else if (isScale) buttonLabel = 'Falar com a equipa';
  const loadingLabel = isTrial ? 'A configurar…' : 'Aguarde…';

  const hasLocation = agency.county || agency.district;

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
        Confirmar subscrição
      </h1>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        Reveja os detalhes antes de começar.
      </p>

      {/* Summary card */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 mb-6">
        {/* Agency */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Imobiliária</p>
            <p className="text-sm font-medium">{agency.name}</p>
            {hasLocation && (
              <p className="text-xs text-muted-foreground">{[agency.county, agency.district].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Plan */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="text-sm font-medium">{plan.name}</p>
              {isTrial && (
                <p className="text-xs text-accent font-medium">1 mês grátis</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {isScale ? (
              <p className="text-sm font-medium">A combinar</p>
            ) : isTrial ? (
              <>
                <p className="text-sm font-medium">Grátis</p>
                <p className="text-xs text-muted-foreground">
                  após trial: {currencySymbol}{plans.find((p) => p.id === 'basic')?.marketPrices?.find((mp) => mp.market === billingCountry?.market)?.price ?? plans.find((p) => p.id === 'basic')?.price}/mês
                </p>
              </>
            ) : (
              <p className="text-sm font-medium">{currencySymbol}{displayPrice}/mês</p>
            )}
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Limits */}
        {!isScale && (
          <div className="grid grid-cols-3 divide-x divide-border/60">
            <div className="flex flex-col items-center gap-1.5 py-1 px-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Home className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="font-display text-base font-700 leading-none">{plan.limits.properties ?? '∞'}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">imóveis</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-1 px-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="font-display text-base font-700 leading-none">{plan.limits.candidatesPerProperty ?? '∞'}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">cand./imóvel</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-1 px-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="font-display text-base font-700 leading-none">{plan.limits.agents ?? '∞'}</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">agentes</p>
            </div>
          </div>
        )}

        {/* Extra lead pricing */}
        {!isScale && !isTrial && (() => {
          const extraPrice = marketEntry?.extraLeadPrice ?? null;
          if (!extraPrice) return null;
          const sym = billingCountry?.currency === 'BRL' ? 'R$' : '€';
          return (
            <>
              <div className="border-t border-border/60" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leads extra</p>
                  <p className="text-sm font-medium">{sym}{extraPrice} por lead adicional</p>
                  <p className="text-[11px] text-muted-foreground">Disponível após atingir o limite do plano</p>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
        Pode cancelar ou alterar o plano a qualquer momento.
      </p>

      <Button
        onClick={onConfirm}
        disabled={submitting}
        className="w-full h-11 rounded-xl font-medium"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />{loadingLabel}</>
        ) : (
          buttonLabel
        )}
      </Button>
    </div>
  );
}
