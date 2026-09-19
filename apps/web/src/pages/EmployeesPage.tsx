import { keepPreviousData, useQuery } from '@tanstack/react-query';
// @tanstack/react-table resolved to v9, a ground-up rewrite: table behaviour
// is composed from a `features` object (tableFeatures()), row data flows
// through `useTable` instead of `useReactTable`, and ColumnDef/Cell/Header
// types all carry that features type as their first parameter. This table
// only needs core behaviour (no sorting/filtering/selection — all of that is
// server-side), so `tableFeatures({})` — no optional features — is enough;
// core row-model/header/cell/row APIs (getHeaderGroups, getRowModel,
// getAllCells, flexRender) are always present regardless.
import { createColumnHelper, flexRender, tableFeatures, useTable } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiFetch } from '@/api/client';
import type { EmployeeListItemResponse, PagedResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/formatMoney';
import {
  COUNTRY_NAMES,
  DEPARTMENT_NAMES,
  JOB_LEVEL_NAMES,
  countryName,
  departmentName,
  jobLevelName,
} from '@/lib/lookups';

const DEFAULT_LIMIT = 25;
/** Radix Select reserves the empty string, so "no filter" needs its own value. */
const ALL = '__all__';
const STATUS_OPTIONS: [string, string][] = [
  ['ACTIVE', 'Active'],
  ['TERMINATED', 'Terminated'],
];

function buildQueryString(searchParams: URLSearchParams): string {
  const qs = new URLSearchParams();
  for (const key of ['department', 'country', 'level', 'status', 'q']) {
    const value = searchParams.get(key);
    if (value !== null && value !== '') qs.set(key, value);
  }
  qs.set('limit', String(Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
  qs.set('offset', String(Number(searchParams.get('offset') ?? 0) || 0));
  return qs.toString();
}

// Static, module-scope per TanStack's own recommendation — features and the
// column helper they type don't depend on anything render-time.
const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, EmployeeListItemResponse>();

// columnHelper.columns(...), not a bare array — it preserves each column's
// individual TValue instead of widening the whole tuple to `unknown`.
const columns = columnHelper.columns([
  columnHelper.accessor('employeeCode', { header: 'Code' }),
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  }),
  columnHelper.display({
    id: 'department',
    header: 'Department',
    cell: ({ row }) => departmentName(row.original.departmentId),
  }),
  columnHelper.display({
    id: 'level',
    header: 'Level',
    cell: ({ row }) => jobLevelName(row.original.jobLevelId),
  }),
  columnHelper.display({
    id: 'country',
    header: 'Country',
    cell: ({ row }) => countryName(row.original.countryCode),
  }),
  columnHelper.display({
    id: 'currentSalary',
    header: 'Current Salary',
    // null (no live salary record) renders as an empty cell, never "—undefined".
    cell: ({ row }) =>
      row.original.currentSalary === null ? '' : formatMoney(row.original.currentSalary),
  }),
  columnHelper.accessor('status', { header: 'Status' }),
]);

export function EmployeesPage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const limit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const offset = Number(searchParams.get('offset') ?? 0) || 0;
  const queryString = buildQueryString(searchParams);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', queryString],
    queryFn: () =>
      apiFetch<PagedResponse<EmployeeListItemResponse>>(`/employees?${queryString}`),
    placeholderData: keepPreviousData,
  });

  const table = useTable({
    features,
    data: data?.items ?? [],
    columns,
  });

  function updateParam(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '' || value === ALL) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      // Any filter change restarts paging from the top.
      next.delete('offset');
      return next;
    });
  }

  function goToOffset(nextOffset: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('offset', String(nextOffset));
      return next;
    });
  }

  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

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

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput initialValue={searchParams.get('q')} onChange={(v) => updateParam('q', v)} />
        <FilterSelect
          label="Department"
          value={searchParams.get('department')}
          onChange={(v) => updateParam('department', v)}
          options={Object.entries(DEPARTMENT_NAMES)}
        />
        <FilterSelect
          label="Country"
          value={searchParams.get('country')}
          onChange={(v) => updateParam('country', v)}
          options={Object.entries(COUNTRY_NAMES)}
        />
        <FilterSelect
          label="Level"
          value={searchParams.get('level')}
          onChange={(v) => updateParam('level', v)}
          options={Object.entries(JOB_LEVEL_NAMES)}
        />
        <FilterSelect
          label="Status"
          value={searchParams.get('status')}
          onChange={(v) => updateParam('status', v)}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-destructive">
                  Failed to load employees.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  No employees match these filters.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {/* getAllCells, not getVisibleCells — visibility is an
                  optional v9 feature we don't include; all columns are
                  always shown here. */}
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total.toLocaleString()} employee{total === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => goToOffset(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + limit >= total}
            onClick={() => goToOffset(offset + limit)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Local, debounced echo of the `q` URL param. Typing updates this input on
 * every keystroke; the URL (and thus the query to the server) only updates
 * 300ms after the user stops, so paging through 10,000 rows doesn't mean a
 * request per keystroke. The table's actual data always comes from the URL,
 * not from this component's state.
 */
function SearchInput({
  initialValue,
  onChange,
}: {
  initialValue: string | null;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    const handle = setTimeout(() => onChange(value), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="w-56 space-y-1.5">
      <label className="text-sm font-medium" htmlFor="q">
        Search
      </label>
      <Input
        id="q"
        placeholder="Name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="w-40 space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value ?? ALL} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
