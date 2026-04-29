import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

type SyncStatus = 'syncing' | 'success' | 'error';

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    apiFetch<{ status: string }>('/subscriptions/sync', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sessionId ?? undefined }),
    })
      .then(async (result) => {
        const returnTo = searchParams.get('return') ?? '/dashboard';
        if (result.status !== 'active') {
          // Backend couldn't activate yet (e.g. webhook still processing)
          setSyncStatus('error');
          setTimeout(() => navigate(returnTo, { replace: true }), 3000);
          return;
        }
        // Refresh auth context so SubscriptionGuard sees the new active status
        await refreshSession();
        setSyncStatus('success');
        setTimeout(() => navigate(returnTo, { replace: true }), 1500);
      })
      .catch(async () => {
        const returnTo = searchParams.get('return') ?? '/dashboard';
        // Try to refresh anyway — webhook may have already activated it
        try { await refreshSession(); } catch { /* ignore */ }
        setSyncStatus('error');
        setTimeout(() => navigate(returnTo, { replace: true }), 3000);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 max-w-xs px-4">
        {syncStatus === 'syncing' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mx-auto" />
            <div>
              <p className="font-display text-base font-600 tracking-tight">A ativar subscrição…</p>
              <p className="text-sm text-muted-foreground mt-1">Só um momento.</p>
            </div>
          </>
        )}
        {syncStatus === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <p className="font-display text-base font-600 tracking-tight">Subscrição ativada!</p>
              <p className="text-sm text-muted-foreground mt-1">A redirecionar para o painel…</p>
            </div>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <div>
              <p className="font-display text-base font-600 tracking-tight">Quase lá…</p>
              <p className="text-sm text-muted-foreground mt-1">O pagamento foi processado. A redirecionar…</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
