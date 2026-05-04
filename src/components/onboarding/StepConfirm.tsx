import { ChevronLeft, Loader2, Building2, FileText, Home, Users, UserCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['onboarding', 'billing', 'common']);
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

  let buttonLabel = t('onboarding:confirm.submitPay');
  if (isTrial) buttonLabel = t('onboarding:confirm.submitTrial');
  else if (isScale) buttonLabel = t('onboarding:confirm.submitScale');
  const loadingLabel = isTrial ? t('onboarding:confirm.settingUp') : t('onboarding:confirm.wait');

  const hasLocation = agency.county || agency.district;

  return (
    <div className="max-w-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('common:actions.back')}
      </button>

      <h1 className="font-display text-3xl font-700 tracking-tight mb-2">
        {t('onboarding:confirm.title')}
      </h1>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        {t('onboarding:confirm.subtitle')}
      </p>

      {/* Summary card */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 mb-6">
        {/* Agency */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('onboarding:confirm.agency')}</p>
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
              <p className="text-xs text-muted-foreground">{t('onboarding:confirm.plan')}</p>
              <p className="text-sm font-medium">{t(`billing:plans.${plan.id}.name`)}</p>
              {isTrial && (
                <p className="text-xs text-accent font-medium">{t('onboarding:confirm.trialFree', { count: 1 })}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {isScale ? (
              <p className="text-sm font-medium">{t('onboarding:confirm.contact')}</p>
            ) : isTrial ? (
              <>
                <p className="text-sm font-medium">{t('onboarding:confirm.free')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('onboarding:confirm.afterTrial', { price: `${currencySymbol}${plans.find((p) => p.id === 'basic')?.marketPrices?.find((mp) => mp.market === billingCountry?.market)?.price ?? plans.find((p) => p.id === 'basic')?.price}` })}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium">{t('onboarding:confirm.pricePerMonth', { price: `${currencySymbol}${displayPrice}` })}</p>
            )}
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Limits */}
        {!isScale && (
          <div className="flex flex-col divide-y divide-border/60 py-2 border-y border-border/60">
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{t('onboarding:plan.properties')}</p>
              </div>
              <p className="font-display text-sm font-700">{plan.limits.properties ?? '∞'}</p>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{t('onboarding:plan.candidatesPerProperty')}</p>
              </div>
              <p className="font-display text-sm font-700">{plan.limits.candidatesPerProperty ?? '∞'}</p>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{t('onboarding:plan.agents')}</p>
              </div>
              <p className="font-display text-sm font-700">{plan.limits.agents ?? '∞'}</p>
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
                  <p className="text-xs text-muted-foreground">{t('onboarding:confirm.extraLeads')}</p>
                  <p className="text-sm font-medium">{sym}{extraPrice} {t('onboarding:confirm.perExtraLead')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('onboarding:confirm.extraLeadsNote')}</p>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
        {t('onboarding:confirm.cancelNote')}
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
