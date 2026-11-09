import { apiFetch } from '@/api/client';
import type { LoginResponse } from '@/api/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
    // This 401 (wrong password) is an expected, inline-handled outcome —
    // not a "your session expired" signal, so skip the redirect interceptor.
    skipAuthRedirect: true,
  });
}
