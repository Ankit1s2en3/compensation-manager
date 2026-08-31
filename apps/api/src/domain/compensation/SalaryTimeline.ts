import type { ChangeReason } from './ChangeReason.js';
import type { SalaryRecord } from './SalaryRecord.js';

export interface SalaryChangeInput {
  amountMinor: number;
  currency: string;
  effectiveFrom: string;
  changeReason: ChangeReason;
  note: string | null;
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
    return new SalaryTimeline({ hireDate: this.#hireDate, records: [record] });
  }
}
