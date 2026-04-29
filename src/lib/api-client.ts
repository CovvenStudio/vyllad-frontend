// ─── Base API Client ──────────────────────────────────────────────────────────
// All backend requests go through here.
// - Attaches Bearer token from the in-memory AuthStore
// - Automatically retries once on 401 by refreshing the token (deduplicated)

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export { BASE_URL };

// In-memory token store (never persists accessToken to localStorage for security)
let _accessToken: string | null = null;

export const tokenStore = {
  get: () => _accessToken,
  set: (t: string | null) => { _accessToken = t; },
  clear: () => { _accessToken = null; },
};

// Shared in-flight refresh promise — prevents parallel /auth/refresh calls
let _refreshPromise: Promise<boolean> | null = null;

export function getOrStartRefresh(doRefresh: () => Promise<boolean>): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('vyllad_refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokenStore.clear();
      localStorage.removeItem('vyllad_refresh_token');
      return false;
    }
    const data = await res.json() as { accessToken: string; refreshToken: string };
    tokenStore.set(data.accessToken);
    localStorage.setItem('vyllad_refresh_token', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const makeRequest = (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  };

  let res = await makeRequest(tokenStore.get());

  // On 401: attempt a single token refresh (deduplicated) then retry once
  if (res.status === 401) {
    const refreshed = await getOrStartRefresh(refreshAccessToken);
    if (!refreshed) throw await buildApiError(res);
    res = await makeRequest(tokenStore.get());
  }

  if (!res.ok) throw await buildApiError(res);

  // Handle empty responses (204, 200 with no body)
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function buildApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body?.message ?? res.statusText, body?.errorCode ?? null);
  } catch {
    return new ApiError(res.status, res.statusText, null);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errorCode: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
