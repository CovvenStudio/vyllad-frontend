// ─── Monitoring Singleton ──────────────────────────────────────────────────────
// This is the ONLY file the rest of the app imports from.
// To swap providers: change the import below + update init() call in main.tsx.

import { SentryProvider } from './providers/sentry.provider';
import { ConsoleProvider } from './providers/console.provider';
import type { IMonitoringProvider } from './types';

const isDev = import.meta.env.DEV;
const hasDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);

export const monitoring: IMonitoringProvider =
  isDev || !hasDsn ? new ConsoleProvider() : new SentryProvider();

export type { MonitoringUser, IMonitoringProvider } from './types';
