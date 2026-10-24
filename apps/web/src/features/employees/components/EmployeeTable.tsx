import { flexRender, useTable } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { EmployeeListItemResponse } from '@/api/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { employeeColumns, employeeTableFeatures } from './columns';

export function EmployeeTable({
  employees,
  isLoading,
  isError,
}: {
  employees: EmployeeListItemResponse[];
  isLoading: boolean;
  isError: boolean;
}) {
  const table = useTable({
    features: employeeTableFeatures,
    data: employees,
    columns: employeeColumns,
  });

  const rows = table.getRowModel().rows;

  return (
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
            <MessageRow className="text-muted-foreground">Loading…</MessageRow>
          )}
          {isError && (
            <MessageRow className="text-destructive">Failed to load employees.</MessageRow>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <MessageRow className="text-muted-foreground">
              No employees match these filters.
            </MessageRow>
          )}
          {!isLoading &&
            !isError &&
            rows.map((row) => (
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
  );
}

function MessageRow({ className, children }: { className: string; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={employeeColumns.length} className={`text-center ${className}`}>
        {children}
      </TableCell>
    </TableRow>
  );
}
