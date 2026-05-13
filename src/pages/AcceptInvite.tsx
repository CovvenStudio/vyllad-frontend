import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteInfo, acceptInvite } from '@/lib/agents-api';
import { ApiError } from '@/lib/api-client';
import { monitoring } from '@/lib/monitoring/monitoring';
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

type InviteState = 'loading' | 'valid' | 'invalid' | 'accepted' | 'error';

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signIn, refreshSession } = useAuth();
  const { t } = useTranslation('auth');

  const [inviteState, setInviteState] = useState<InviteState>('loading');
  const [inviteInfo, setInviteInfo] = useState<{ agencyName: string; email: string; expiresAt: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!token) { setInviteState('invalid'); return; }
    getInviteInfo(token)
      .then((info) => {
        if (!info.valid) { setInviteState('invalid'); return; }
        setInviteInfo(info);
        setInviteState('valid');
      })
      .catch(() => setInviteState('invalid'));
  }, [token]);

  // Auto-accept once the user is logged in and invite is valid
  useEffect(() => {
    if (inviteState !== 'valid' || !user || !token) return;
    (async () => {
      setAccepting(true);
      try {
        await acceptInvite(token);
        await refreshSession();
        setInviteState('accepted');
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 409) {
            // Could be "already a member" or "plan limit reached"
            if (e.message.toLowerCase().includes('limite')) {
              setErrorMsg(e.message);
              setInviteState('error');
              return;
            }
            // already a member — just go to dashboard
            await refreshSession();
            navigate('/dashboard', { replace: true });
            return;
          }
          setErrorMsg(
            e.status === 403
              ? t('invite.wrongEmail')
              : e.status === 400
              ? t('invite.expired')
              : e.message
          );
        } else {
          monitoring.captureException(e, { context: 'accept-invite' });
          setErrorMsg('Erro ao aceitar convite.');
        }
        setInviteState('error');
      } finally {
        setAccepting(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteState, user, token]);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSigningIn(true);
      try {
        await signIn(tokenResponse.access_token);
        // useEffect above will fire automatically after user state updates
      } catch (err) {
        monitoring.captureException(err, { context: 'accept-invite-google-signin' });
        setErrorMsg(t('invite.errorAuth'));
        setInviteState('error');
      } finally {
        setSigningIn(false);
      }
    },
    onError: () => {
      setErrorMsg(t('invite.authCancelled'));
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <LanguageSwitcher className="absolute top-6 right-6" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Loading */}
        {inviteState === 'loading' && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">{t('invite.loading')}</p>
          </div>
        )}

        {/* Invalid */}
        {inviteState === 'invalid' && (
          <div className="text-center space-y-3">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="font-display text-xl font-700">{t('invite.invalidTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('invite.invalidDesc')}</p>
            <Button variant="outline" className="mt-2 w-full rounded-xl" onClick={() => navigate('/login')}>
              {t('invite.goToLogin')}
            </Button>
          </div>
        )}

        {/* Valid + not logged in */}
        {inviteState === 'valid' && !user && (
          <div className="text-center space-y-5">
            <div className="space-y-1">
              <h1 className="font-display text-xl font-700">{t('invite.invited')}</h1>
              <p className="text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: t('invite.joinPrompt', { name: inviteInfo?.agencyName ?? '' }) }}
              />
              {inviteInfo?.email && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('invite.sentTo', { email: inviteInfo.email })}
                </p>
              )}
            </div>
            <Button
              onClick={() => handleGoogleLogin()}
              disabled={signingIn}
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold border-border gap-3"
            >
              {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              {t('login.signInGoogle')}
            </Button>
          </div>
        )}

        {/* Valid + logged in → accepting */}
        {inviteState === 'valid' && user && accepting && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">{t('invite.accepting')}</p>
          </div>
        )}

        {/* Accepted */}
        {inviteState === 'accepted' && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="font-display text-xl font-700">{t('invite.welcomeTitle')}</h1>
            <p className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: t('invite.joinedSuccess', { name: inviteInfo?.agencyName ?? '' }) }}
            />
            <Button className="w-full rounded-xl font-semibold" onClick={() => navigate('/dashboard', { replace: true })}>
              {t('invite.goToDashboard')}
            </Button>
          </div>
        )}

        {/* Error */}
        {inviteState === 'error' && (
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="font-display text-xl font-700">{t('invite.errorTitle')}</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" className="mt-2 w-full rounded-xl" onClick={() => navigate('/login')}>
              {t('invite.goToLogin')}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AcceptInvite;
