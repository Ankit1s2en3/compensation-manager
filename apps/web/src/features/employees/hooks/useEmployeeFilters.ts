import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  EMPLOYEE_FILTER_KEYS,
  type EmployeeFilterKey,
  type EmployeeFilterValues,
} from '../api';

const DEFAULT_LIMIT = 25;

/**
 * The URL is the single source of truth for the directory's filters and
 * paging. This hook parses it once per change and hands back plain values
 * plus the two ways the screen is allowed to change it.
 */
export function useEmployeeFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const parsed = useMemo(() => {
    const filters = {} as EmployeeFilterValues;
    for (const key of EMPLOYEE_FILTER_KEYS) {
      const value = searchParams.get(key);
      filters[key] = value === '' ? null : value;
    }
    // `|| default` also catches NaN and an empty `?limit=`.
    const limit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
    const offset = Number(searchParams.get('offset') ?? 0) || 0;
    return { filters, limit, offset };
  }, [searchParams]);

  function setFilter(key: EmployeeFilterKey, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      // Any filter change restarts paging from the top.
      next.delete('offset');
      return next;
    });
  }

  function setOffset(nextOffset: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('offset', String(nextOffset));
      return next;
    });
  }

  return { ...parsed, setFilter, setOffset };
}
