import { useNavigate } from 'react-router-dom';

import { EmployeeFilters } from './components/EmployeeFilters';
import { EmployeePagination } from './components/EmployeePagination';
import { EmployeeTable } from './components/EmployeeTable';
import { useEmployeeFilters } from './hooks/useEmployeeFilters';
import { useEmployees } from './hooks/useEmployees';
import { FROM_DIRECTORY_STATE, employeePath } from './paths';

export function EmployeesPage() {
  const navigate = useNavigate();
  const { filters, limit, offset, setFilter, setOffset } = useEmployeeFilters();
  const { data, isLoading, isError } = useEmployees({ ...filters, limit, offset });

  return (
    <div className="space-y-4">
      <EmployeeFilters filters={filters} onFilterChange={setFilter} />

      <EmployeeTable
        employees={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRowClick={(employee) =>
          navigate(employeePath(employee.id), { state: FROM_DIRECTORY_STATE })
        }
      />

      <EmployeePagination
        total={data?.total ?? 0}
        limit={limit}
        offset={offset}
        onOffsetChange={setOffset}
      />
    </div>
  );
}
