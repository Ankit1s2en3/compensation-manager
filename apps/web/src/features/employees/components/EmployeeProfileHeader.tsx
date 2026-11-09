import type { EmployeeResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';

export function EmployeeProfileHeader({ employee }: { employee: EmployeeResponse }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">
          {employee.firstName} {employee.lastName}
        </h2>
        <Badge variant={employee.status === 'ACTIVE' ? 'secondary' : 'muted'}>
          {employee.status === 'ACTIVE' ? 'Active' : 'Terminated'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {employee.jobTitle} · {employee.employeeCode}
      </p>
    </div>
  );
}
