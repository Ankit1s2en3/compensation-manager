import { Badge } from '@/components/ui/badge';
import { formatDate, formatInstantDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

import { CHANGE_REASON_LABELS } from '../labels';
import type { TimelineEntry } from '../timeline';

const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

/**
 * Newest first. Corrected records stay in the list, struck through — a
 * correction must be visible, not silent.
 */
export function SalaryTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <section className="rounded-md border p-4">
      <h3 className="mb-3 text-sm font-semibold">Salary timeline</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No salary records.</p>
      ) : (
        <ol className="space-y-0">
          {entries.map((entry) => (
            <TimelineItem key={entry.record.id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const { record, status, correctsRecordId, changePercent } = entry;
  const isSuperseded = status === 'superseded';

  return (
    <li className="relative border-l pb-5 pl-5 last:pb-0">
      <span
        aria-hidden
        className={cn(
          'absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-background',
          status === 'current' ? 'bg-primary' : 'bg-border',
        )}
      />
      <div className={cn('space-y-1', isSuperseded && 'text-muted-foreground')}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn('font-semibold tabular-nums', isSuperseded && 'line-through')}
          >
            {formatMoney(record.amount)}
          </span>
          {changePercent !== null && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {percentFormat.format(changePercent / 100)}
            </span>
          )}
          <span className="text-sm">{CHANGE_REASON_LABELS[record.changeReason]}</span>
          {status === 'current' && <Badge>Current</Badge>}
          {status === 'upcoming' && <Badge variant="outline">Upcoming</Badge>}
          {correctsRecordId !== null && <Badge variant="secondary">Correction</Badge>}
          {isSuperseded && <Badge variant="muted">Corrected</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatPeriod(record.effectiveFrom, record.effectiveTo, status)}
          {isSuperseded && record.supersededAt !== null && (
            <> · corrected on {formatInstantDate(record.supersededAt)}</>
          )}
        </p>
        {record.note !== null && record.note !== '' && (
          <p className="text-sm">{record.note}</p>
        )}
      </div>
    </li>
  );
}

function formatPeriod(from: string, to: string | null, status: TimelineEntry['status']): string {
  if (to !== null) return `${formatDate(from)} – ${formatDate(to)}`;
  if (status === 'upcoming') return `From ${formatDate(from)}`;
  if (status === 'superseded') return `From ${formatDate(from)}`;
  return `${formatDate(from)} – present`;
}
