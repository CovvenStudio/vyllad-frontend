import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlans } from '@/plans';
import { useBillingCountries } from '@/billing-countries/useBillingCountries';
import { BillingCountrySelect } from '@/billing-countries/BillingCountrySelect';
import type { Plan } from '@/plans';
import type { BillingCountry } from '@/billing-countries/useBillingCountries';

function PricingCard({ plan, index, billingCountry }: { plan: Plan; index: number; billingCountry: BillingCountry | null }) {
  const isTrial = plan.id === 'trial';
  const isScale = plan.id === 'scale';
  const isHighlighted = plan.highlighted;

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
      {plan.badge && (
        <span className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap',
          isHighlighted
            ? 'bg-foreground text-background'
            : isTrial
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-muted text-muted-foreground',
        )}>
          {plan.badge}
        </span>
      )}

      {/* Plan name & tagline */}
      <div className="mb-5">
        <p className="font-display text-lg font-700 tracking-tight">{plan.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-6">
        {plan.billing === 'contact' ? (
          <span className="font-display text-2xl font-700 tracking-tight">Contactar</span>
        ) : isTrial ? (
          <>
            <span className="font-display text-4xl font-700 tracking-tight">Grátis</span>
            <span className="text-xs text-muted-foreground ml-1">/ {plan.limits.trialDays} dias</span>
          </>
        ) : (
          <>
            <span className="font-display text-4xl font-700 tracking-tight">{currencySymbol}{displayPrice}</span>
            <span className="text-xs text-muted-foreground">/mês</span>
          </>
        )}
      </div>

      {/* Limits chips */}
      {!isScale && (
        <div className="grid grid-cols-3 divide-x divide-border/60 mb-6 pb-6 border-b border-border/60">
          <div className="text-center px-6">
            <p className="font-display text-xl font-700">{plan.limits.properties ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">imóveis</p>
          </div>
          <div className="text-center px-6">
            <p className="font-display text-xl font-700">{plan.limits.candidatesPerProperty ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">cand./imóvel</p>
          </div>
          <div className="text-center px-6">
            <p className="font-display text-xl font-700">{plan.limits.agents ?? '∞'}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">agentes</p>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-8">
        {plan.features.map((f) => (
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
            {plan.cta}
          </Button>
        </a>
      ) : (
        <Link to="/login">
          <Button
            variant={isHighlighted ? 'default' : 'outline'}
            className="w-full h-11 rounded-xl font-medium"
          >
            {plan.cta}
          </Button>
        </Link>
      )}
    </motion.div>
  );
}

const Pricing = () => {
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
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent mb-4">Preços</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] font-700 tracking-tight mb-5 leading-tight">
            Simples. Transparente.<br className="hidden md:block" /> Sem surpresas.
          </h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            Comece grátis. Pague apenas quando precisar de mais. Sem contratos, sem taxas escondidas.
          </p>

          {/* Billing country selector */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm text-muted-foreground">País de faturação:</span>
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
            <span className="text-sm">A carregar planos…</span>
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
          Pode cancelar ou alterar o plano a qualquer momento.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
