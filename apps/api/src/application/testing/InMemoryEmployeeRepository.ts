import type { Money } from '../../domain/money/Money.js';
import type {
  Employee,
  EmployeeListItem,
  EmployeeRepository,
  EmployeeSearchCriteria,
  Page,
  Paged,
} from '../ports/EmployeeRepository.js';

export class InMemoryEmployeeRepository implements EmployeeRepository {
  readonly #employees: Employee[];
  readonly #currentSalaries: Map<string, Money>;

  /** Every search() call, in order — for assertions. */
  readonly searchCalls: Array<{
    criteria: EmployeeSearchCriteria;
    page: Page;
    on: string;
  }> = [];

  constructor(
    employees: Employee[] = [],
    currentSalaries: Map<string, Money> = new Map(),
  ) {
    this.#employees = employees;
    this.#currentSalaries = currentSalaries;
  }

  findById(id: string): Promise<Employee | null> {
    return Promise.resolve(this.#employees.find((e) => e.id === id) ?? null);
  }

  search(
    criteria: EmployeeSearchCriteria,
    page: Page,
    on: string,
  ): Promise<Paged<EmployeeListItem>> {
    this.searchCalls.push({ criteria, page, on });

    const matched = this.#employees.filter((e) => {
      if (
        criteria.departmentId !== undefined &&
        e.departmentId !== criteria.departmentId
      )
        return false;
      if (
        criteria.countryCode !== undefined &&
        e.countryCode !== criteria.countryCode
      )
        return false;
      if (
        criteria.jobLevelId !== undefined &&
        e.jobLevelId !== criteria.jobLevelId
      )
        return false;
      if (criteria.status !== undefined && e.status !== criteria.status)
        return false;
      if (criteria.nameQuery !== undefined) {
        const name = `${e.firstName} ${e.lastName}`.toLowerCase();
        if (!name.includes(criteria.nameQuery.toLowerCase())) return false;
      }
      return true;
    });

    const items: EmployeeListItem[] = matched
      .slice(page.offset, page.offset + page.limit)
      .map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        departmentId: e.departmentId,
        jobLevelId: e.jobLevelId,
        countryCode: e.countryCode,
        status: e.status,
        currentSalary: this.#currentSalaries.get(e.id) ?? null,
      }));

    return Promise.resolve({
      items,
      total: matched.length,
      limit: page.limit,
      offset: page.offset,
    });
  }
}
