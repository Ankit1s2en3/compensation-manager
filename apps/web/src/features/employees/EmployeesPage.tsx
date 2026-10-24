import { EmployeeFilters } from './components/EmployeeFilters';
import { EmployeePagination } from './components/EmployeePagination';
import { EmployeeTable } from './components/EmployeeTable';
import { useEmployeeFilters } from './hooks/useEmployeeFilters';
import { useEmployees } from './hooks/useEmployees';

export function EmployeesPage() {
  const { filters, limit, offset, setFilter, setOffset } = useEmployeeFilters();
  const { data, isLoading, isError } = useEmployees({ ...filters, limit, offset });

  return (
    <div className="space-y-4">
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
