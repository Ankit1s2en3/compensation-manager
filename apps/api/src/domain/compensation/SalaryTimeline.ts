import { DomainError } from '../shared/DomainError.js';
import type { ChangeReason } from './ChangeReason.js';
import type { SalaryRecord } from './SalaryRecord.js';

export interface SalaryChangeInput {
  amountMinor: number;
  currency: string;
  effectiveFrom: string;
  changeReason: ChangeReason;
  note: string | null;
}

/** I3: effective_from must be on or after the employee's hire date. */
export class EffectiveDateBeforeHireError extends DomainError {
  constructor(attempted: string, hireDate: string) {
    super(`effective date ${attempted} is before the hire date ${hireDate}`);
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
 * (docs/data-model.md §5). Immutable — every operation returns a new timeline.
 */
export class SalaryTimeline {
  readonly #hireDate: string;
  readonly #records: readonly SalaryRecord[];

  constructor(params: { hireDate: string; records: readonly SalaryRecord[] }) {
    this.#hireDate = params.hireDate;
    this.#records = params.records;
  }

  get records(): readonly SalaryRecord[] {
    return this.#records;
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

  recordChange(input: SalaryChangeInput): SalaryTimeline {
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

    const closed = this.#records.map((r) =>
      r.effectiveTo === null && r.supersededAt === null
        ? { ...r, effectiveTo: previousDay(input.effectiveFrom) }
        : r,
    );

    const record: SalaryRecord = {
      id: null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      changeReason: input.changeReason,
      note: input.note,
      supersededAt: null,
      supersededById: null,
    };
    return new SalaryTimeline({
      hireDate: this.#hireDate,
      records: [...closed, record],
    });
  }

  #latestLiveRecord(): SalaryRecord | null {
    const live = this.#records.filter((r) => r.supersededAt === null);
    return live.reduce<SalaryRecord | null>(
      (latest, r) =>
        latest === null || r.effectiveFrom > latest.effectiveFrom ? r : latest,
      null,
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
