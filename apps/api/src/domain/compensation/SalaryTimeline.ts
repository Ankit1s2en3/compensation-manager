import { Money } from '../money/Money.js';
import type { Clock } from '../shared/Clock.js';
import { DomainError } from '../shared/DomainError.js';
import type { ChangeReason } from './ChangeReason.js';
import type { NewSalaryRecord, SalaryRecord } from './SalaryRecord.js';

export interface SalaryChangeInput {
  amountMinor: number;
  currency: string;
  effectiveFrom: string;
  changeReason: ChangeReason;
  note: string | null;
}

/**
 * What a change requires to be written, as a description the application layer
 * executes in one transaction (I7). The domain decides what; the app decides how,
 * and fills supersede's replacement id once the insert returns.
 */
export interface TimelineWrites {
  closePeriod?: { recordId: string; effectiveTo: string };
  supersede?: { recordId: string; at: Date };
  insert: NewSalaryRecord;
}

/** I3: effective_from must be on or after the employee's hire date. */
export class EffectiveDateBeforeHireError extends DomainError {
  constructor(attempted: string, hireDate: string) {
    super(`effective date ${attempted} is before the hire date ${hireDate}`);
  }
}

/** I5: a record may be superseded at most once. */
export class AlreadyCorrectedError extends DomainError {
  constructor(recordId: string) {
    super(`salary record ${recordId} has already been corrected`);
  }
}

/** I8: a change must start strictly after the latest live record's effective_from. */
export class RetroactiveChangeError extends DomainError {
  constructor(attempted: string, latestLive: string) {
    super(
      `a salary change must start after the latest live record (${latestLive}); got ${attempted}`,
    );
  }
}

/**
 * An employee's salary history and the rules for changing it
 * (docs/data-model.md §5). Pure — it reads its records and never writes them;
 * change operations return a TimelineWrites description for the caller to apply.
 */
export class SalaryTimeline {
  readonly #hireDate: string;
  readonly #records: readonly SalaryRecord[];

  constructor(params: { hireDate: string; records: readonly SalaryRecord[] }) {
    this.#hireDate = params.hireDate;
    this.#records = params.records;
  }

  /** The record in force on `date` (ISO `YYYY-MM-DD`), or null if none covers it. */
  currentAt(date: string): SalaryRecord | null {
    return (
      this.#records.find(
        (r) =>
          r.supersededAt === null &&
          r.effectiveFrom <= date &&
          (r.effectiveTo === null || date <= r.effectiveTo),
      ) ?? null
    );
  }

  recordChange(input: SalaryChangeInput): TimelineWrites {
    if (input.effectiveFrom < this.#hireDate) {
      throw new EffectiveDateBeforeHireError(input.effectiveFrom, this.#hireDate);
    }

    const latestLive = this.#latestLiveRecord();
    if (latestLive !== null && input.effectiveFrom <= latestLive.effectiveFrom) {
      throw new RetroactiveChangeError(
        input.effectiveFrom,
        latestLive.effectiveFrom,
      );
    }

    const insert: NewSalaryRecord = {
      amount: Money.of(input.amountMinor, input.currency),
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      changeReason: input.changeReason,
      note: input.note,
    };

    const open = this.#openLivePeriod();
    return open === null
      ? { insert }
      : {
          closePeriod: {
            recordId: open.id,
            effectiveTo: previousDay(input.effectiveFrom),
          },
          insert,
        };
  }

  /**
   * Supersede `recordId` with a copy that keeps its dating and reason but takes
   * a new amount and note. Two writes: mark the original, insert the replacement.
   */
  correct(
    recordId: string,
    amount: Money,
    note: string,
    clock: Clock,
  ): TimelineWrites {
    const target = this.#records.find((r) => r.id === recordId);
    if (target === undefined) {
      throw new DomainError(`no salary record with id ${recordId}`);
    }
    if (target.supersededAt !== null) {
      throw new AlreadyCorrectedError(recordId);
    }

    return {
      supersede: { recordId, at: clock.now() },
      insert: {
        amount,
        effectiveFrom: target.effectiveFrom,
        effectiveTo: target.effectiveTo,
        changeReason: target.changeReason,
        note,
      },
    };
  }

  #latestLiveRecord(): SalaryRecord | null {
    const live = this.#records.filter((r) => r.supersededAt === null);
    return live.reduce<SalaryRecord | null>(
      (latest, r) =>
        latest === null || r.effectiveFrom > latest.effectiveFrom ? r : latest,
      null,
    );
  }

  #openLivePeriod(): SalaryRecord | null {
    return (
      this.#records.find(
        (r) => r.supersededAt === null && r.effectiveTo === null,
      ) ?? null
    );
  }
}

/** The calendar day before an ISO `YYYY-MM-DD` date. Pure — no `Date`. */
function previousDay(iso: string): string {
  // Domain dates are well-formed YYYY-MM-DD (validated at the HTTP boundary).
  const [year, month, day] = iso.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  if (day > 1) {
    return `${year}-${pad2(month)}-${pad2(day - 1)}`;
  }
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${pad2(prevMonth)}-${pad2(lastDayOfMonth(prevYear, prevMonth))}`;
}

function lastDayOfMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
