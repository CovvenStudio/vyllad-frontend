import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlans } from '@/plans';
import { useBillingCountries } from '@/billing-countries/useBillingCountries';
import { BillingCountrySelect } from '@/billing-countries/BillingCountrySelect';
import type { Plan } from '@/plans';
import type { BillingCountry } from '@/billing-countries/useBillingCountries';

function PricingCard({ plan, index, billingCountry }: { plan: Plan; index: number; billingCountry: BillingCountry | null }) {
  const { t } = useTranslation(['landing', 'billing']);
  const isTrial = plan.id === 'trial';
  const isScale = plan.id === 'scale';
  const isHighlighted = plan.highlighted;

  const translatedBadge = plan.badge ? t(`billing:plans.${plan.id}.badge`) : null;
  const translatedFeatures = t(`billing:plans.${plan.id}.features`, { returnObjects: true }) as string[];

  const marketEntry = billingCountry && plan.marketPrices
    ? plan.marketPrices.find((mp) => mp.market === billingCountry.market) ?? null
    : null;
  const displayPrice = marketEntry !== null ? marketEntry.price : plan.price;
  const currency = billingCountry?.currency ?? 'EUR';
  const currencySymbol = currency === 'BRL' ? 'R$' : '€';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={cn(
        'relative rounded-2xl border flex flex-col p-7 transition-shadow',
        isHighlighted
          ? 'border-foreground bg-card shadow-xl'
          : isTrial
          ? 'border-dashed border-border bg-card/50'
          : 'border-border bg-card',
      )}
    >
      {/* Badge */}
      {translatedBadge && (
        <span className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap',
          isHighlighted
            ? 'bg-foreground text-background'
            : isTrial
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-muted text-muted-foreground',
        )}>
          {translatedBadge}
        </span>
      )}

      {/* Plan name & tagline */}
      <div className="mb-5">
        <p className="font-display text-lg font-700 tracking-tight">{t(`billing:plans.${plan.id}.name`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`billing:plans.${plan.id}.tagline`)}</p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-6">
        {plan.billing === 'contact' ? (
          <span className="font-display text-2xl font-700 tracking-tight">{t('pricing.contact')}</span>
        ) : isTrial ? (
          <>
            <span className="font-display text-4xl font-700 tracking-tight">{t('pricing.free')}</span>
            <span className="text-xs text-muted-foreground ml-1">{t('pricing.trialDays', { count: plan.limits.trialDays })}</span>
          </>
        ) : (
          <>
            <span className="font-display text-4xl font-700 tracking-tight">{currencySymbol}{displayPrice}</span>
            <span className="text-xs text-muted-foreground">{t('pricing.perMonth')}</span>
          </>
        )}
      </div>

      {/* Limits chips */}
      {!isScale && (
        <div className="flex flex-col divide-y divide-border/60 mb-6 py-2 border-y border-border/60">
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('pricing.properties')}</p>
            <p className="font-display text-sm font-700">{plan.limits.properties ?? '∞'}</p>
          </div>
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('pricing.candidatesPerProperty')}</p>
            <p className="font-display text-sm font-700">{plan.limits.candidatesPerProperty ?? '∞'}</p>
          </div>
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs text-muted-foreground">{t('pricing.agents')}</p>
            <p className="font-display text-sm font-700">{plan.limits.agents ?? '∞'}</p>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-8">
        {translatedFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isScale ? (
        <a href="mailto:hello@vyllad.pt?subject=Scale%20Plan%20-%20Interesse">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-medium"
          >
            {t(`billing:plans.${plan.id}.cta`)}
          </Button>
        </a>
      ) : (
        <Link to="/login">
          <Button
            variant={isHighlighted ? 'default' : 'outline'}
            className="w-full h-11 rounded-xl font-medium"
          >
            {t(`billing:plans.${plan.id}.cta`)}
          </Button>
        </Link>
      )}
    </motion.div>
  );
}

const Pricing = () => {
  const { t } = useTranslation('landing');
  const { plans, loading } = usePlans();
  const { countries, loading: countriesLoading } = useBillingCountries();
  const [billingCountry, setBillingCountry] = useState<BillingCountry | null>(null);

  // Default to Portugal, fall back to first country
  useEffect(() => {
    if (!billingCountry && countries.length > 0) {
      const pt = countries.find((c) => c.countryCode === 'PT') ?? countries[0];
      setBillingCountry(pt);
    }
  }, [countries, billingCountry]);

  return (
    <section id="pricing" className="py-28 md:py-36">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent mb-4">{t('pricing.tag')}</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] font-700 tracking-tight mb-5 leading-tight">
            {t('pricing.headline1')}<br className="hidden md:block" /> {t('pricing.headline2')}
          </h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            {t('pricing.sub')}
          </p>

          {/* Billing country selector */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm text-muted-foreground">{t('pricing.billingCountry')}</span>
            <BillingCountrySelect
              countries={countries}
              value={billingCountry}
              onChange={setBillingCountry}
              loading={countriesLoading}
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 text-muted-foreground py-16">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t('pricing.loading')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
            {plans.map((plan, i) => (
              <PricingCard key={plan.id} plan={plan} index={i} billingCountry={billingCountry} />
            ))}
          </div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground mt-10"
        >
          {t('pricing.cancel')}
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
