import type { EmployeeListParams } from './api';

/**
 * Hierarchical so invalidation can be as broad or narrow as needed:
 * `employeeKeys.all` hits every employee query, `list(params)` one page.
 */
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (params: EmployeeListParams) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};
