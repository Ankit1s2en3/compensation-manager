import { AlreadyCorrectedError } from '../../domain/compensation/errors.js';
import { covers, isLive } from '../../domain/compensation/SalaryRecord.js';
import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import { SalaryTimeline } from '../../domain/compensation/SalaryTimeline.js';
import type { TimelineWrites } from '../../domain/compensation/SalaryTimeline.js';
import { SalaryRecordNotFoundError } from '../errors.js';
import type { SalaryRecordRepository } from '../ports/SalaryRecordRepository.js';

export interface EmployeeTimelineSeed {
  employeeId: string;
  hireDate: string;
  records: SalaryRecord[];
}

/**
 * Applies TimelineWrites the same way DrizzleSalaryRecordRepository does — close
 * the open period, insert the replacement, supersede the original — so the use
 * cases run against the real write shape.
 */
export class InMemorySalaryRecordRepository implements SalaryRecordRepository {
  readonly #hireDates = new Map<string, string>();
  readonly #byEmployee = new Map<string, SalaryRecord[]>();
  #nextId = 1;

  /** Every apply() call, in order — for assertions. */
  readonly applyCalls: TimelineWrites[] = [];

  constructor(seeds: EmployeeTimelineSeed[] = []) {
    for (const seed of seeds) {
      this.#hireDates.set(seed.employeeId, seed.hireDate);
      this.#byEmployee.set(seed.employeeId, [...seed.records]);
      for (const r of seed.records) {
        const n = Number(r.id);
        if (Number.isInteger(n) && n >= this.#nextId) this.#nextId = n + 1;
      }
    }
  }

  async findTimeline(employeeId: string): Promise<SalaryTimeline> {
    const hireDate = this.#hireDates.get(employeeId);
    if (hireDate === undefined) {
      throw new Error(`no employee ${employeeId}`);
    }
    const records = [...(this.#byEmployee.get(employeeId) ?? [])].sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        Number(a.id) - Number(b.id),
    );
    return new SalaryTimeline({ employeeId, hireDate, records });
  }

  async findTimelineForRecord(recordId: string): Promise<SalaryTimeline> {
    for (const [employeeId, list] of this.#byEmployee.entries()) {
      if (list.some((r) => r.id === recordId)) {
        return this.findTimeline(employeeId);
      }
    }
    throw new SalaryRecordNotFoundError(recordId);
  }

  async findCurrentSalary(
    employeeId: string,
    on: string,
  ): Promise<SalaryRecord | null> {
    const covering = (this.#byEmployee.get(employeeId) ?? [])
      .filter((r) => isLive(r) && covers(r, on))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return covering[0] ?? null;
  }

  async apply(writes: TimelineWrites): Promise<SalaryRecord> {
    this.applyCalls.push(writes);

    if (writes.closePeriod !== undefined) {
      const { recordId, effectiveTo } = writes.closePeriod;
      this.#replace(recordId, (r) => ({ ...r, effectiveTo }));
    }

    const inserted: SalaryRecord = {
      id: String(this.#nextId++),
      amount: writes.insert.amount,
      effectiveFrom: writes.insert.effectiveFrom,
      effectiveTo: writes.insert.effectiveTo,
      changeReason: writes.insert.changeReason,
      note: writes.insert.note,
      supersededAt: null,
      supersededById: null,
    };
    const list = this.#byEmployee.get(writes.insert.employeeId) ?? [];
    list.push(inserted);
    this.#byEmployee.set(writes.insert.employeeId, list);

    if (writes.supersede !== undefined) {
      const { recordId, at } = writes.supersede;
      const found = this.#find(recordId);
      if (found === null || found.record.supersededAt !== null) {
        throw new AlreadyCorrectedError(recordId);
      }
      this.#replace(recordId, (r) => ({
        ...r,
        supersededAt: at,
        supersededById: inserted.id,
      }));
    }

    return inserted;
  }

  #find(
    recordId: string,
  ): { list: SalaryRecord[]; index: number; record: SalaryRecord } | null {
    for (const list of this.#byEmployee.values()) {
      const index = list.findIndex((r) => r.id === recordId);
      if (index !== -1) {
        return { list, index, record: list[index]! };
      }
    }
    return null;
  }

  #replace(
    recordId: string,
    update: (record: SalaryRecord) => SalaryRecord,
  ): void {
    const found = this.#find(recordId);
    if (found === null) {
      throw new Error(`no salary record ${recordId}`);
    }
    found.list[found.index] = update(found.record);
  }
}
