import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { resolveFirstAccessibleLoggedRoute } from '@/lib/route-access';
import heroVilla from '@/assets/hero-villa.jpg';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { needsOnboarding, memberships } = await signIn(tokenResponse.access_token);
      if (needsOnboarding) {
        navigate('/onboarding', { replace: true });
      } else if (memberships.length === 1 && memberships[0].role === 'OWNER') {
        const target = resolveFirstAccessibleLoggedRoute(memberships[0].role, { isEnabled }) ?? '/system-unavailable';
        navigate(target, { replace: true });
      } else {
        // Multiple agencies, or single agency but not owner — show select so they can create their own
        navigate('/select-agency', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invite.errorAuth'));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError(t('login.googleFailed')),
  });

  const handleGoogleClick = () => {
    setError(null);
    googleLogin();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col items-center justify-center px-8 py-12 relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-1">
          <span className="font-display text-xl font-700 tracking-tight">vyllad</span>
          <span className="text-accent text-xl">.</span>
        </Link>
        <LanguageSwitcher className="absolute top-8 right-8" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <h1 className="font-display text-3xl font-700 tracking-tight mb-3">{t('login.welcome')}</h1>
          <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
            {t('login.description')}
          </p>

          <Button
            onClick={handleGoogleClick}
            disabled={loading}
            variant="outline"
            className="w-full h-12 rounded-xl font-medium text-sm gap-3 border-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                {t('login.signInGoogle')}
              </>
            )}
          </Button>

          {error && (
            <p className="mt-4 text-sm text-destructive text-center">{error}</p>
          )}

        </motion.div>
      </div>

      {/* Right: imagery */}
      <div className="hidden lg:block relative overflow-hidden bg-primary">
        <motion.img
          src={heroVilla}
          alt="Villa de luxo"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: 'easeOut' }}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-primary-foreground">
          <p className="text-xs tracking-[0.2em] uppercase text-accent mb-3">{t('login.heroLabel')}</p>
          <p className="font-display text-2xl font-600 leading-tight max-w-md">
            {t('login.testimonial')}
          </p>
          <p className="text-sm text-primary-foreground/60 mt-4">{t('login.testimonialAuthor')}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
