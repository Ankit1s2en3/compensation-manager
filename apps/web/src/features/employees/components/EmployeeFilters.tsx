import { COUNTRY_NAMES, DEPARTMENT_NAMES, JOB_LEVEL_NAMES } from '@/lib/lookups';

import type { EmployeeFilterKey, EmployeeFilterValues } from '../api';
import { FilterSelect } from './FilterSelect';
import { SearchInput } from './SearchInput';

const STATUS_OPTIONS: [string, string][] = [
  ['ACTIVE', 'Active'],
  ['TERMINATED', 'Terminated'],
];

export function EmployeeFilters({
  filters,
  onFilterChange,
}: {
  filters: EmployeeFilterValues;
  onFilterChange: (key: EmployeeFilterKey, value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchInput initialValue={filters.q} onChange={(v) => onFilterChange('q', v)} />
      <FilterSelect
        label="Department"
        value={filters.department}
        onChange={(v) => onFilterChange('department', v)}
        options={Object.entries(DEPARTMENT_NAMES)}
      />
      <FilterSelect
        label="Country"
        value={filters.country}
        onChange={(v) => onFilterChange('country', v)}
        options={Object.entries(COUNTRY_NAMES)}
      />
      <FilterSelect
        label="Level"
        value={filters.level}
        onChange={(v) => onFilterChange('level', v)}
        options={Object.entries(JOB_LEVEL_NAMES)}
      />
      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(v) => onFilterChange('status', v)}
        options={STATUS_OPTIONS}
      />
    </div>
  );
}
