import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, CalendarCheck, TrendingUp, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import heroVilla from '@/assets/hero-villa.jpg';

// Glassmorphism card that floats + drifts continuously
function DataCard({
  children,
  className,
  delay,
  floatY = [-6, 0],
  floatDuration = 6,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
  floatY?: [number, number];
  floatDuration?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <motion.div
        animate={{ y: [floatY[0], floatY[1], floatY[0]] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut' }}
        className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const Hero = () => {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Parallax: background moves slower than the viewport
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  // Content fades + rises on scroll
  const contentY = useTransform(scrollYProgress, [0, 0.6], ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen min-h-[680px] flex items-center justify-center overflow-hidden">

      {/* ── Cinematic background ─────────────────────────────────────── */}
      <motion.div className="absolute inset-0 overflow-hidden" style={{ y: bgY }}>
        <img
          src={heroVilla}
          alt=""
          className="cinematic-pan w-full h-full object-cover"
        />
        {/* Dramatic multi-layer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
      </motion.div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 container mx-auto px-6 text-center max-w-5xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-xs tracking-[0.18em] uppercase text-white/75 mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {t('hero.badge')}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[3.2rem] md:text-[5.5rem] lg:text-[7rem] font-700 text-white leading-[0.93] tracking-tight mb-8"
        >
          {t('hero.headline1')}<br />
          <span className="text-gradient-light">{t('hero.headline2')}</span><br />
          {t('hero.headline3')}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="font-display text-xl md:text-2xl text-white font-600 tracking-tight mb-3"
        >
          {t('hero.tagline1')}{' '}
          <span className="text-gradient-light">{t('hero.tagline2')}</span>
        </motion.p>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.8 }}
          className="text-white/55 text-base md:text-lg max-w-md mx-auto mb-12 leading-relaxed"
        >
          {t('hero.sub')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link to="/login">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-semibold rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 group gap-2 shadow-xl shadow-accent/30"
            >
              {t('hero.ctaStart')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/p/t2-campo-ourique-lisboa">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-semibold rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/20 backdrop-blur-sm shadow-none"
              variant="ghost"
            >
              {t('hero.ctaDemo')}
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Floating data cards (the "camera reveal" moment) ─────────── */}

      {/* Score card — top left */}
      <DataCard
        delay={1.1}
        floatY={[-8, 0]}
        floatDuration={6}
        className="absolute top-[20%] left-[5%] xl:left-[10%] hidden lg:block"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/25 border border-green-400/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">{t('hero.scoreCard.name')}</p>
            <p className="text-white/50 text-[10px]">{t('hero.scoreCard.label')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-green-400 to-accent" />
          </div>
          <span className="text-white text-xs font-700 tabular-nums">92</span>
        </div>
      </DataCard>

      {/* Visit card — top right */}
      <DataCard
        delay={1.4}
        floatY={[0, 8]}
        floatDuration={7}
        className="absolute top-[16%] right-[5%] xl:right-[10%] hidden lg:block"
      >
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-4 h-4 text-accent shrink-0" />
          <p className="text-white text-xs font-semibold">{t('hero.visitCard.label')}</p>
        </div>
        <p className="text-white/75 text-xs font-medium">{t('hero.visitCard.time')}</p>
        <p className="text-white/45 text-[10px] mt-0.5">{t('hero.visitCard.location')}</p>
      </DataCard>

      {/* Stats card — bottom left */}
      <DataCard
        delay={1.7}
        floatY={[-5, 0]}
        floatDuration={5}
        className="absolute bottom-[20%] left-[5%] xl:left-[10%] hidden lg:block"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
          <p className="text-white/55 text-[10px] uppercase tracking-widest">{t('hero.statsCard.period')}</p>
        </div>
        <p className="text-white font-display text-3xl font-700 leading-none">{t('hero.statsCard.value')}</p>
        <p className="text-white/55 text-[10px] mt-1">{t('hero.statsCard.label')}</p>
      </DataCard>

      {/* Property card — bottom right */}
      <DataCard
        delay={2.0}
        floatY={[0, 7]}
        floatDuration={8}
        className="absolute bottom-[20%] right-[5%] xl:right-[10%] hidden lg:block"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
          <p className="text-white text-xs font-semibold">{t('hero.propertyCard.location')}</p>
        </div>
        <p className="text-white font-display font-700 text-sm">{t('hero.propertyCard.price')}</p>
        <p className="text-white/45 text-[10px] mt-1">{t('hero.propertyCard.stats')}</p>
      </DataCard>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ scaleY: [1, 0.4, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-10 bg-gradient-to-b from-white/50 to-transparent mx-auto"
        />
      </motion.div>
    </section>
  );
};

export default Hero;
