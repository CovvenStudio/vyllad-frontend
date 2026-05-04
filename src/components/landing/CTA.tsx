import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import heroVilla from '@/assets/hero-villa.jpg';

const CTA = () => {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="py-28 md:py-36 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] min-h-[480px] flex items-center justify-center"
        >
          {/* Background image with parallax */}
          <motion.div className="absolute inset-0 overflow-hidden rounded-[2.5rem]" style={{ y: bgY }}>
            <img
              src={heroVilla}
              alt=""
              className="w-full h-full object-cover scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
          </motion.div>

          {/* Accent orb */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 text-center px-8 md:px-16 py-20">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xs font-medium tracking-[0.2em] uppercase text-accent mb-7"
            >
              {t('cta.tag')}
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-3xl md:text-5xl lg:text-6xl font-700 text-primary-foreground mb-6 tracking-tight leading-[1.05]"
            >
              {t('cta.headline1')}<br className="hidden md:block" />
              {t('cta.headline2')}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-primary-foreground/55 text-base md:text-lg max-w-md mx-auto mb-12 leading-relaxed"
            >
              {t('cta.sub')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.55 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link to="/login">
                <Button
                  size="lg"
                  className="h-12 px-8 text-sm font-semibold rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 gap-2 shadow-xl shadow-accent/30"
                >
                  {t('cta.ctaStart')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/p/t2-campo-ourique-lisboa">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-8 text-sm font-semibold rounded-2xl text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                >
                  {t('cta.ctaDemo')}
                </Button>
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="text-primary-foreground/30 text-xs mt-8 tracking-wide"
            >
              {t('cta.trust')}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
