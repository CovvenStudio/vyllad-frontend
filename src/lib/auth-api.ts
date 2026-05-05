// ─── Auth API ─────────────────────────────────────────────────────────────────
// Thin wrapper over the /api/auth endpoints.

import { apiFetch, tokenStore, BASE_URL, getOrStartRefresh } from './api-client';
import { monitoring } from './monitoring/monitoring';

// ── Shape returned by POST /auth/google and GET /auth/me ──────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  planId: string | null;
  trialRequestedAt: string | null;
  trialAllowedAt: string | null;
}

export interface AuthMembership {
  id: string;
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  role: 'OWNER' | 'MANAGER' | 'AGENT';
  agencyCountryCode: string | null;
}

export interface AuthSubscription {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete';
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AuthSession {
  user: AuthUser;
  memberships: AuthMembership[];
  subscription: AuthSubscription | null;
  accessToken: string;
  refreshToken: string;
  needsOnboarding: boolean;
}

export interface MeResponse {
  user: AuthUser;
  memberships: AuthMembership[];
  subscription: AuthSubscription | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function signInWithGoogle(googleAccessToken: string): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ accessToken: googleAccessToken }),
  });
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

export async function requestTrial(): Promise<void> {
  await apiFetch('/users/me/request-trial', { method: 'POST' });
}

export async function logoutApi(): Promise<void> {
  const refreshToken = localStorage.getItem('vyllad_refresh_token');
  if (!refreshToken) return;
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Ignore errors on logout
  }
}

// ── Session persistence helpers ───────────────────────────────────────────────

export function persistSession(session: AuthSession) {
  if (!session.accessToken || !session.refreshToken) {
    throw new Error('Resposta de autenticação inválida do servidor.');
  }
  tokenStore.set(session.accessToken);
  localStorage.setItem('vyllad_refresh_token', session.refreshToken);
}

/** Explicitly refresh the access token using the stored refresh token.
 *  Deduplicated — concurrent calls share the same in-flight promise. */
export async function refreshTokens(): Promise<boolean> {
  return getOrStartRefresh(async () => {
    const refreshToken = localStorage.getItem('vyllad_refresh_token');
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const data = await res.json() as { accessToken: string; refreshToken: string };
      tokenStore.set(data.accessToken);
      localStorage.setItem('vyllad_refresh_token', data.refreshToken);
      return true;
    } catch (err) {
      monitoring.captureException(err, { context: 'session-restore' });
      return false;
    }
  });
}

export function clearSession() {
  tokenStore.clear();
  localStorage.removeItem('vyllad_refresh_token');
}

export function hasPersistedSession(): boolean {
  return !!localStorage.getItem('vyllad_refresh_token');
}
