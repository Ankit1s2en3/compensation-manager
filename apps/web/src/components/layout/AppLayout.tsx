import { Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';

/** Shell for every signed-in screen: page container, header, then the route. */
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Employees</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {user !== null && <span>{user.email}</span>}
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
