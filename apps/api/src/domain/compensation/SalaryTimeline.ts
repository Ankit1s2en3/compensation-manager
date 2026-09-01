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

  recordChange(input: SalaryChangeInput): SalaryTimeline {
    const latestLive = this.#latestLiveRecord();
    if (latestLive !== null && input.effectiveFrom <= latestLive.effectiveFrom) {
      throw new RetroactiveChangeError(
        input.effectiveFrom,
        latestLive.effectiveFrom,
      );
    }

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
      records: [...this.#records, record],
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
