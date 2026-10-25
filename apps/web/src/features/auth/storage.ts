import type { AuthenticatedUserResponse } from '@/api/types';

/**
 * Plain localStorage helpers — usable both from the non-React client.ts (the
 * 401 interceptor) and from AuthProvider. Token and user are stored together
 * under one key so a refresh can restore both without a round trip: there is
 * no GET /api/auth/me to re-verify against.
 */

const STORAGE_KEY = 'compensation-manager.auth';

interface StoredAuth {
  token: string;
  user: AuthenticatedUserResponse;
}

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}

export function setAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}
