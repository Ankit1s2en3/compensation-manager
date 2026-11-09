import type { SalaryRecordResponse } from '@/api/types';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';

import { CHANGE_REASON_LABELS } from '../labels';

export function CompensationSummary({
  currentRecord,
  upcomingRecord,
}: {
  currentRecord: SalaryRecordResponse | null;
  upcomingRecord: SalaryRecordResponse | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-md border p-4">
        <h3 className="text-sm text-muted-foreground">Current salary</h3>
        {currentRecord === null ? (
          <p className="mt-1 text-sm text-muted-foreground">No salary in force today.</p>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(currentRecord.amount)}
            </p>
            <p className="text-sm text-muted-foreground">
              {CHANGE_REASON_LABELS[currentRecord.changeReason]} · since{' '}
              {formatDate(currentRecord.effectiveFrom)}
            </p>
          </>
        )}
      </section>

      {upcomingRecord !== null && (
        <section className="rounded-md border p-4">
          <h3 className="text-sm text-muted-foreground">Upcoming change</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(upcomingRecord.amount)}
          </p>
          <p className="text-sm text-muted-foreground">
            {CHANGE_REASON_LABELS[upcomingRecord.changeReason]} · from{' '}
            {formatDate(upcomingRecord.effectiveFrom)}
          </p>
        </section>
      )}
    </div>
  );
}
