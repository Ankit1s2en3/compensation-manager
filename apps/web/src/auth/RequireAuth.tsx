import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/auth/AuthProvider';

/**
 * Gates on status === 'unauthenticated' specifically — never on
 * `!== 'authenticated'`. The latter would also redirect during the brief
 * `unverified` render on a fresh page load, bouncing a valid deep link
 * through /login before the stored token was even checked.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === 'unverified') {
    return null;
  }

  return <>{children}</>;
}
