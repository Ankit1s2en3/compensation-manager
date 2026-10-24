import { apiFetch } from '@/api/client';
import type { EmployeeListItemResponse, PagedResponse } from '@/api/types';

export const EMPLOYEE_FILTER_KEYS = ['department', 'country', 'level', 'status', 'q'] as const;
export type EmployeeFilterKey = (typeof EMPLOYEE_FILTER_KEYS)[number];

/**
 * Filter values exactly as they sit in the URL — unvalidated strings, null
 * when absent. The server's zod schema is the authority on what's legal, so
 * nothing here narrows e.g. `status` to EmployeeStatus.
 */
export type EmployeeFilterValues = Record<EmployeeFilterKey, string | null>;

export interface EmployeeListParams extends EmployeeFilterValues {
  limit: number;
  offset: number;
}

function toQueryString(params: EmployeeListParams): string {
  const qs = new URLSearchParams();
  for (const key of EMPLOYEE_FILTER_KEYS) {
    const value = params[key];
    if (value !== null && value !== '') qs.set(key, value);
  }
  qs.set('limit', String(params.limit));
  qs.set('offset', String(params.offset));
  return qs.toString();
}

export function listEmployees(
  params: EmployeeListParams,
): Promise<PagedResponse<EmployeeListItemResponse>> {
  return apiFetch<PagedResponse<EmployeeListItemResponse>>(`/employees?${toQueryString(params)}`);
}
