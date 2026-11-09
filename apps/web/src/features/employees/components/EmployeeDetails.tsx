import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { EmployeeResponse } from '@/api/types';
import { formatDate } from '@/lib/formatDate';
import { countryName, departmentName, jobLevelName } from '@/lib/lookups';

import { EMPLOYMENT_TYPE_LABELS } from '../labels';
import { employeePath } from '../paths';

export function EmployeeDetails({ employee }: { employee: EmployeeResponse }) {
  return (
    <section className="rounded-md border p-4">
      <h3 className="mb-3 text-sm font-semibold">Details</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Email">{employee.email}</Field>
        <Field label="Department">{departmentName(employee.departmentId)}</Field>
        <Field label="Level">{jobLevelName(employee.jobLevelId)}</Field>
        <Field label="Country">{countryName(employee.countryCode)}</Field>
        <Field label="Employment type">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</Field>
        <Field label="Hire date">{formatDate(employee.hireDate)}</Field>
        <Field label="Manager">
          {employee.managerId === null ? (
            '—'
          ) : (
            <Link to={employeePath(employee.managerId)} className="underline underline-offset-4">
              View manager
            </Link>
          )}
        </Field>
      </dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
