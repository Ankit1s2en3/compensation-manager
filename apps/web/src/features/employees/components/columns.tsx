// @tanstack/react-table resolved to v9, a ground-up rewrite: table behaviour
// is composed from a `features` object (tableFeatures()), row data flows
// through `useTable` instead of `useReactTable`, and ColumnDef/Cell/Header
// types all carry that features type as their first parameter. This table
// only needs core behaviour (no sorting/filtering/selection — all of that is
// server-side), so `tableFeatures({})` — no optional features — is enough;
// core row-model/header/cell/row APIs (getHeaderGroups, getRowModel,
// getAllCells, flexRender) are always present regardless.
import { createColumnHelper, tableFeatures } from '@tanstack/react-table';

import type { EmployeeListItemResponse } from '@/api/types';
import { formatMoney } from '@/lib/formatMoney';
import { countryName, departmentName, jobLevelName } from '@/lib/lookups';

// Static, module-scope per TanStack's own recommendation — features and the
// column helper they type don't depend on anything render-time.
export const employeeTableFeatures = tableFeatures({});
const columnHelper = createColumnHelper<typeof employeeTableFeatures, EmployeeListItemResponse>();

// columnHelper.columns(...), not a bare array — it preserves each column's
// individual TValue instead of widening the whole tuple to `unknown`.
export const employeeColumns = columnHelper.columns([
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
