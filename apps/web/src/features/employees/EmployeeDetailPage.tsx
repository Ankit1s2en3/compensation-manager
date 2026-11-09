import { useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';

import { BackToDirectoryLink } from './components/BackToDirectoryLink';
import { CompensationSummary } from './components/CompensationSummary';
import { EmployeeDetails } from './components/EmployeeDetails';
import { EmployeeProfileHeader } from './components/EmployeeProfileHeader';
import { SalaryTimeline } from './components/SalaryTimeline';
import { useEmployeeProfile } from './hooks/useEmployeeProfile';
import { buildTimeline } from './timeline';

export function EmployeeDetailPage() {
  // The route only matches with the param present.
  const { employeeId = '' } = useParams<{ employeeId: string }>();
  const { data, isLoading, error } = useEmployeeProfile(employeeId);

  return (
    <div className="space-y-4">
      <BackToDirectoryLink />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError && error.status === 404
            ? 'Employee not found.'
            : 'Failed to load employee.'}
        </p>
      )}

      {data !== undefined && (
        <>
          <EmployeeProfileHeader employee={data.employee} />
          <CompensationSummary
            currentRecord={data.currentRecord}
            upcomingRecord={data.upcomingRecord}
          />
          <EmployeeDetails employee={data.employee} />
          <SalaryTimeline entries={buildTimeline(data)} />
        </>
      )}
    </div>
  );
}
