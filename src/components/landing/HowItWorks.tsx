import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const HowItWorks = () => {
  const { t } = useTranslation('landing');
  const steps = (t('howItWorks.steps', { returnObjects: true }) as { title: string; description: string; detail: string }[]);

  return (
    <section className="py-28 md:py-40 border-y bg-card overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mb-20"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent mb-5">{t('howItWorks.tag')}</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] lg:text-5xl font-700 tracking-tight leading-tight">
            {t('howItWorks.headline1')}<br className="hidden md:block" />
            <span className="text-muted-foreground">{t('howItWorks.headline2')}</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7 }}
              className="group grid grid-cols-[80px_1fr] gap-8 py-10 border-b border-border/50 last:border-0"
            >
              <div className="font-display text-5xl font-700 text-accent/20 group-hover:text-accent/40 transition-colors duration-500 tabular-nums pt-1">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h3 className="font-display text-xl font-700 mb-2 tracking-tight">{step.title}</h3>
                <p className="text-foreground/70 text-sm leading-relaxed mb-2">{step.description}</p>
                <p className="text-muted-foreground text-xs leading-relaxed italic">{step.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
