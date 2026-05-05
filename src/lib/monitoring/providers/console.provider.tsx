// ─── Console Provider ─────────────────────────────────────────────────────────
// No-op / console implementation used in development and tests.
// Zero external dependencies — safe to use without any DSN configured.

import type { IMonitoringProvider, MonitoringInitOptions, MonitoringUser } from '../types';

export class ConsoleProvider implements IMonitoringProvider {
  init(_options: MonitoringInitOptions): void {
    console.info('[monitoring] ConsoleProvider active — no events sent to external services.');
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    console.error('[monitoring] captureException', error, context ?? '');
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console[level]('[monitoring] captureMessage', message);
  }

  setUser(user: MonitoringUser | null): void {
    console.info('[monitoring] setUser', user);
  }

  addBreadcrumb(message: string, category = 'app'): void {
    console.debug(`[monitoring:${category}]`, message);
  }

  ErrorBoundary: IMonitoringProvider['ErrorBoundary'] = ({ children }) => <>{children}</>;
}
