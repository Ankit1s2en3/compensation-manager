import type { Money } from '../../domain/money/Money.js';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';

// Hand-written, not `typeof employees.$inferSelect`. A port describes what the
// application needs, not what Drizzle happens to store — deriving it from the
// schema would pull an infrastructure type into application/. Keep the two in
// sync by hand; infrastructure/repositories/mappers.ts is the seam.
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  jobLevelId: string;
  jobTitle: string;
  countryCode: string;
  employmentType: EmploymentType;
  hireDate: string;
  managerId: string | null;
  status: EmployeeStatus;
}

/** A directory row: the fields a list shows, plus the current pay in one query. */
export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  jobLevelId: string;
  countryCode: string;
  status: EmployeeStatus;
  currentSalary: Money | null;
}

export interface EmployeeSearchCriteria {
  departmentId?: string;
  countryCode?: string;
  jobLevelId?: string;
  status?: EmployeeStatus;
  nameQuery?: string;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;

  /**
   * Server-side directory search. The current salary is resolved in the same
   * query (a lateral join) — never one lookup per row. `on` (ISO YYYY-MM-DD) is
   * the date "current salary" is measured at; the caller supplies it, same as
   * findCurrentSalary.
   */
  search(
    criteria: EmployeeSearchCriteria,
    page: Page,
    on: string,
  ): Promise<Paged<EmployeeListItem>>;
}
