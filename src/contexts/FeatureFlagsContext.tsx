import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listFeatureFlags, isFeatureEnabled, type FeatureFlagDto } from '@/lib/feature-flags-api';
import { monitoring } from '@/lib/monitoring/monitoring';

type FeatureFlagsContextValue = {
  loading: boolean;
  flags: FeatureFlagDto[];
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [flags, setFlags] = useState<FeatureFlagDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (status !== 'authenticated') {
      setFlags([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await listFeatureFlags();
      setFlags(data);
    } catch (err) {
      // Fail-open: if flags endpoint fails, keep features enabled.
      monitoring.captureException(err, { context: 'load-feature-flags' });
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [status]);

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    loading,
    flags,
    isEnabled: (key: string) => isFeatureEnabled(key, flags),
    refresh,
  }), [loading, flags]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used inside <FeatureFlagsProvider>');
  return ctx;
}
