import { CorrectSalaryRecord } from './application/CorrectSalaryRecord.js';
import { GetCompensationStats } from './application/GetCompensationStats.js';
import { GetEmployeeProfile } from './application/GetEmployeeProfile.js';
import { ListEmployees } from './application/ListEmployees.js';
import { RecordSalaryChange } from './application/RecordSalaryChange.js';
import type { Clock } from './domain/shared/Clock.js';
import type { Database } from './infrastructure/db.js';
import { DrizzleCompensationStatsQuery } from './infrastructure/repositories/DrizzleCompensationStatsQuery.js';
import { DrizzleEmployeeRepository } from './infrastructure/repositories/DrizzleEmployeeRepository.js';
import { DrizzleExchangeRateProvider } from './infrastructure/repositories/DrizzleExchangeRateProvider.js';
import { DrizzleSalaryRecordRepository } from './infrastructure/repositories/DrizzleSalaryRecordRepository.js';
import { SystemClock } from './infrastructure/SystemClock.js';

/** The wired use cases — everything a route handler needs. */
export interface Container {
  listEmployees: ListEmployees;
  getEmployeeProfile: GetEmployeeProfile;
  recordSalaryChange: RecordSalaryChange;
  correctSalaryRecord: CorrectSalaryRecord;
  getCompensationStats: GetCompensationStats;
}

/**
 * Composition root. `clock` defaults to the real one; tests pass a fixed one
 * (or, for the HTTP integration suite, a Postgres db pointed at fixtures whose
 * dates never move — see docs/data-model.md §5 fixtures).
 */
export function createContainer(
  db: Database,
  clock: Clock = new SystemClock(),
): Container {
  const employees = new DrizzleEmployeeRepository(db);
  const exchangeRates = new DrizzleExchangeRateProvider(db);
  const salaries = new DrizzleSalaryRecordRepository(db, exchangeRates);
  const stats = new DrizzleCompensationStatsQuery(db);

  return {
    listEmployees: new ListEmployees(employees, clock),
    getEmployeeProfile: new GetEmployeeProfile(employees, salaries, clock),
    recordSalaryChange: new RecordSalaryChange(salaries),
    correctSalaryRecord: new CorrectSalaryRecord(salaries, clock),
    getCompensationStats: new GetCompensationStats(stats, clock),
  };
}
