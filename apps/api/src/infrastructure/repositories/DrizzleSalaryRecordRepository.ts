import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { SalaryRecordNotFoundError } from '../../application/errors.js';
import type { ExchangeRateProvider } from '../../application/ports/ExchangeRateProvider.js';
import type { SalaryRecordRepository } from '../../application/ports/SalaryRecordRepository.js';
import { AlreadyCorrectedError } from '../../domain/compensation/errors.js';
import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import { SalaryTimeline } from '../../domain/compensation/SalaryTimeline.js';
import type { TimelineWrites } from '../../domain/compensation/SalaryTimeline.js';
import type { Database } from '../db.js';
import { employees, salaryRecords } from '../schema.js';
import { fxToBaseMinor } from './fx.js';
import { toSalaryRecord } from './mappers.js';
import { liveAndCovering } from './predicates.js';

/** Acting user for writes until the use-case layer threads the authenticated one. */
const CREATED_BY = 'system';

export class DrizzleSalaryRecordRepository implements SalaryRecordRepository {
  constructor(
    private readonly db: Database,
    private readonly exchangeRates: ExchangeRateProvider,
  ) {}

  async findTimeline(employeeId: string): Promise<SalaryTimeline> {
    const id = Number(employeeId);

    const [emp] = await this.db
      .select({ hireDate: employees.hireDate })
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);
    if (emp === undefined) {
      throw new Error(`no employee ${employeeId}`);
    }

    const rows = await this.db
      .select()
      .from(salaryRecords)
      .where(eq(salaryRecords.employeeId, id))
      .orderBy(salaryRecords.effectiveFrom, salaryRecords.id);

    return new SalaryTimeline({
      employeeId,
      hireDate: emp.hireDate,
      records: rows.map(toSalaryRecord),
    });
  }

  async findTimelineForRecord(recordId: string): Promise<SalaryTimeline> {
    const [row] = await this.db
      .select({ employeeId: salaryRecords.employeeId })
      .from(salaryRecords)
      .where(eq(salaryRecords.id, Number(recordId)))
      .limit(1);
    if (row === undefined) {
      throw new SalaryRecordNotFoundError(recordId);
    }
    return this.findTimeline(String(row.employeeId));
  }

  async findCurrentSalary(
    employeeId: string,
    on: string,
  ): Promise<SalaryRecord | null> {
    const [row] = await this.db
      .select()
      .from(salaryRecords)
      .where(
        and(eq(salaryRecords.employeeId, Number(employeeId)), liveAndCovering(on)),
      )
      .orderBy(desc(salaryRecords.effectiveFrom))
      .limit(1);

    return row === undefined ? null : toSalaryRecord(row);
  }

  async apply(writes: TimelineWrites): Promise<SalaryRecord> {
    const currency = writes.insert.amount.currency;
    const amountMinor = writes.insert.amount.amountMinor;
    const active = await this.exchangeRates.activeRateSet();
    const rate = await this.exchangeRates.rateFor(currency);
    const amountBaseMinor = fxToBaseMinor(amountMinor, currency, rate);

    return this.db.transaction(async (tx) => {
      // ADR-0007: a correction inserts the replacement while the original is
      // still live and sharing its date range — defer the overlap check to
      // COMMIT for this transaction only.
      if (writes.supersede) {
        await tx.execute(sql`SET CONSTRAINTS salary_no_overlap DEFERRED`);
      }

      // 1. close the open period, if the change opens a new one
      if (writes.closePeriod) {
        await tx
          .update(salaryRecords)
          .set({ effectiveTo: writes.closePeriod.effectiveTo })
          .where(eq(salaryRecords.id, Number(writes.closePeriod.recordId)));
      }

      // 3. insert the new record, capture its id
      const [inserted] = await tx
        .insert(salaryRecords)
        .values({
          employeeId: Number(writes.insert.employeeId),
          amountMinor,
          currencyCode: currency,
          effectiveFrom: writes.insert.effectiveFrom,
          effectiveTo: writes.insert.effectiveTo,
          changeReason: writes.insert.changeReason,
          note: writes.insert.note,
          fxRateSetId: Number(active.id),
          fxRateToBase: rate.toFixed(8),
          amountBaseMinor,
          createdBy: CREATED_BY,
        })
        .returning();
      if (inserted === undefined) {
        throw new Error('insert returned no row');
      }

      // 4. now the link exists — mark the original superseded. Guarded by
      // supersededAt IS NULL (§6): if that hits zero rows, a concurrent
      // correction already claimed this record, so fail with the domain's
      // own I5 error rather than an opaque constraint violation at COMMIT.
      if (writes.supersede) {
        const updated = await tx
          .update(salaryRecords)
          .set({
            supersededAt: writes.supersede.at,
            supersededById: inserted.id,
          })
          .where(
            and(
              eq(salaryRecords.id, Number(writes.supersede.recordId)),
              isNull(salaryRecords.supersededAt),
            ),
          )
          .returning({ id: salaryRecords.id });

        if (updated.length === 0) {
          throw new AlreadyCorrectedError(writes.supersede.recordId);
        }
      }

      return toSalaryRecord(inserted);
    });
  }
}
