export const DIRECTORY_PATH = '/employees';

export function employeePath(id: string): string {
  return `${DIRECTORY_PATH}/${encodeURIComponent(id)}`;
}

/**
 * Set on navigations from the directory to a profile, so "Back" can return to
 * the exact directory URL (filters, page) via history instead of resetting it.
 */
export const FROM_DIRECTORY_STATE = { fromDirectory: true } as const;

export function cameFromDirectory(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as { fromDirectory?: unknown }).fromDirectory === true
  );
}
