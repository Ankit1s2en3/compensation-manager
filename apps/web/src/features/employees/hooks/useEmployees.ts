import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listEmployees, type EmployeeListParams } from '../api';
import { employeeKeys } from '../queryKeys';

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => listEmployees(params),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
