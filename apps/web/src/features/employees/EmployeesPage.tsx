import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';

import { EmployeeFilters } from './components/EmployeeFilters';
import { EmployeePagination } from './components/EmployeePagination';
import { EmployeeTable } from './components/EmployeeTable';
import { useEmployeeFilters } from './hooks/useEmployeeFilters';
import { useEmployees } from './hooks/useEmployees';

export function EmployeesPage() {
  const { user, logout } = useAuth();
  const { filters, limit, offset, setFilter, setOffset } = useEmployeeFilters();
  const { data, isLoading, isError } = useEmployees({ ...filters, limit, offset });

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

      <EmployeeFilters filters={filters} onFilterChange={setFilter} />

      <EmployeeTable employees={data?.items ?? []} isLoading={isLoading} isError={isError} />

      <EmployeePagination
        total={data?.total ?? 0}
        limit={limit}
        offset={offset}
        onOffsetChange={setOffset}
      />
    </div>
  );
}
