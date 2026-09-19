import { clearAuth, getToken } from '@/auth/storage';

/**
 * Mirrors the server's error-response shapes: ZodError -> 400 with
 * fieldErrors; not-found/domain-invalid/invalid-credentials -> { error, code };
 * anything else -> 500 with just { error }. See
 * apps/api/src/http/middleware/errorHandler.ts.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string[] | undefined>;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; fieldErrors?: Record<string, string[] | undefined> },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.fieldErrors = options?.fieldErrors;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * The login request's own 401 (wrong password) is an inline, expected UI
   * error, not a "your session died" signal — skip the clear-token-and-
   * redirect behaviour for it.
   */
  skipAuthRedirect?: boolean;
}

/**
 * Fetch wrapper: attaches the bearer token, parses JSON, throws a typed
 * ApiError on any non-2xx response, and on a genuine 401 clears the stored
 * token and bounces to /login. Nothing about the request shape is typed
 * per-endpoint — callers supply the response type as `T` and the path.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, skipAuthRedirect, headers, ...rest } = options;
  const token = getToken();

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !skipAuthRedirect) {
    clearAuth();
    window.location.assign('/login');
    // The redirect above is a full navigation, not a React one — throw so
    // callers on this tick don't try to use a response that never arrived.
    throw new ApiError(401, 'Session expired');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = payload as
      | { error?: string; code?: string; fieldErrors?: Record<string, string[] | undefined> }
      | null;
    throw new ApiError(response.status, errorBody?.error ?? 'Request failed', {
      code: errorBody?.code,
      fieldErrors: errorBody?.fieldErrors,
    });
  }

  return payload as T;
}
