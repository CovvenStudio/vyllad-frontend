// ─── Sentry Provider ──────────────────────────────────────────────────────────
// Concrete implementation using @sentry/react.
// Only this file knows about Sentry — the rest of the app is provider-agnostic.

import * as Sentry from '@sentry/react';
import type { IMonitoringProvider, MonitoringInitOptions, MonitoringUser } from '../types';

const IGNORED_ERRORS = [
  // Browser extensions injecting scripts
  'chrome-extension://',
  'moz-extension://',
  // Benign browser quirk
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
];

export class SentryProvider implements IMonitoringProvider {
  init(options: MonitoringInitOptions): void {
    Sentry.init({
      dsn: options.dsn,
      environment: options.environment,
      release: options.release,
      tracesSampleRate: options.tracesSampleRate ?? 0.2,
      replaysOnErrorSampleRate: options.replaysOnErrorSampleRate ?? 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event, hint) {
        const msg = (hint?.originalException as Error)?.message ?? '';
        if (IGNORED_ERRORS.some((pattern) => msg.includes(pattern))) return null;
        return event;
      },
    });
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  setUser(user: MonitoringUser | null): void {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
      if (user.agencyId) Sentry.setTag('agencyId', user.agencyId);
    } else {
      Sentry.setUser(null);
    }
  }

  addBreadcrumb(message: string, category = 'app'): void {
    Sentry.addBreadcrumb({ message, category, level: 'info' });
  }

  ErrorBoundary: IMonitoringProvider['ErrorBoundary'] = ({ fallback, children }) => (
    <Sentry.ErrorBoundary fallback={fallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
