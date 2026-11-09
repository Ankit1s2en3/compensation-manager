import { useQuery } from '@tanstack/react-query';

import { getEmployeeProfile } from '../api';
import { employeeKeys } from '../queryKeys';

export function useEmployeeProfile(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => getEmployeeProfile(id),
  });
}
