import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const Showcase = () => {
  const { t } = useTranslation('landing');
  const pain = (t('showcase.pain', { returnObjects: true }) as { stat: string; label: string; description: string }[]);

  return (
    <section className="py-28 md:py-40 bg-primary overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mb-20"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent mb-5">{t('showcase.tag')}</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] lg:text-5xl font-700 text-primary-foreground leading-tight tracking-tight">
            {t('showcase.headline1')}{' '}
            <span className="text-primary-foreground/40">{t('showcase.headline2')}</span>{' '}
            {t('showcase.headline3')}
          </h2>
        </motion.div>

        {/* Pain stats */}
        <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-3xl overflow-hidden">
          {pain.map((item, i) => (
            <motion.div
              key={item.stat}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7 }}
              className="bg-primary p-10 md:p-12 group hover:bg-white/[0.03] transition-colors duration-500"
            >
              <div className="font-display text-6xl md:text-7xl font-700 text-accent leading-none mb-4 tracking-tight">
                {item.stat}
              </div>
              <p className="text-primary-foreground/50 text-xs uppercase tracking-[0.18em] mb-4">{item.label}</p>
              <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-xs">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bridge line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-primary-foreground/35 text-sm mt-16 tracking-wide"
        >
          {t('showcase.bridge')}
        </motion.p>
      </div>
    </section>
  );
};

export default Showcase;
