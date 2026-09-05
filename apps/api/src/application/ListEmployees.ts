import type { Clock } from '../domain/shared/Clock.js';
import type {
  EmployeeListItem,
  EmployeeRepository,
  EmployeeSearchCriteria,
  Page,
  Paged,
} from './ports/EmployeeRepository.js';

/** The employee directory. Thin — the repository does the work. */
export class ListEmployees {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly clock: Clock,
  ) {}

  execute(
    criteria: EmployeeSearchCriteria,
    page: Page,
  ): Promise<Paged<EmployeeListItem>> {
    return this.employees.search(criteria, page, this.clock.today());
  }
}
