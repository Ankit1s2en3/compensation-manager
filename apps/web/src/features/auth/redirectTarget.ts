const DEFAULT_TARGET = '/employees';

/**
 * Where to send the user once they're authenticated. RequireAuth stashes the
 * blocked location as `state.from`; restore its pathname + search so a deep
 * link like /employees?department=eng&offset=50 survives the trip through
 * /login. History state is untyped (and survives reloads), so validate it:
 * only same-app absolute paths, never protocol-relative `//host`, and never
 * /login itself.
 */
export function redirectTarget(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return DEFAULT_TARGET;
  }
  const from = (state as { from: unknown }).from;
  if (typeof from !== 'object' || from === null) return DEFAULT_TARGET;

  const { pathname, search } = from as { pathname?: unknown; search?: unknown };
  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === '/login'
  ) {
    return DEFAULT_TARGET;
  }
  return pathname + (typeof search === 'string' ? search : '');
}
