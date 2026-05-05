// ─── Monitoring Abstraction ────────────────────────────────────────────────────
// The app NEVER imports a monitoring provider directly.
// All code uses IMonitoringProvider from this file.
// Swapping providers (Sentry → Datadog → etc.) = change providers/ only.

export interface MonitoringUser {
  id: string;
  email?: string;
  agencyId?: string;
}

export interface MonitoringInitOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

export interface IMonitoringProvider {
  /** Call once at app startup. */
  init(options: MonitoringInitOptions): void;
  /** Capture an unexpected error with optional extra context. */
  captureException(error: unknown, context?: Record<string, unknown>): void;
  /** Capture a manual message (info, warning, or error). */
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  /** Identify the logged-in user. Pass null on logout. */
  setUser(user: MonitoringUser | null): void;
  /** Add a breadcrumb to the current trace (useful before key operations). */
  addBreadcrumb(message: string, category?: string): void;
  /** Wrap a React tree with the provider's error boundary. */
  ErrorBoundary: React.ComponentType<{ fallback: React.ReactNode; children: React.ReactNode }>;
}
