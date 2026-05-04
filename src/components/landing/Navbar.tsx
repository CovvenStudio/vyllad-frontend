import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const Navbar = () => {
  const { t } = useTranslation('landing');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-2xl border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1">
          <span
            className={`font-display text-xl font-700 tracking-tight transition-colors duration-500 ${
              scrolled ? 'text-foreground' : 'text-white'
            }`}
          >
            vyllad
          </span>
          <span className="text-accent text-xl">.</span>
        </Link>

        <div className="flex items-center gap-5">
          <a
            href="#pricing"
            className={`text-sm transition-colors duration-500 hidden sm:block ${
              scrolled
                ? 'text-muted-foreground hover:text-foreground'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {t('navbar.pricing')}
          </a>
          <Link to="/login">
            <Button
              size="sm"
              className={`font-medium rounded-lg text-sm px-5 transition-all duration-500 ${
                scrolled
                  ? ''
                  : 'bg-white text-foreground hover:bg-white/90 border-0 shadow-none'
              }`}
            >
              {t('navbar.start')}
            </Button>
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

