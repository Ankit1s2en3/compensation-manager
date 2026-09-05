/**
 * An application-layer error: the domain has no Employee concept, so "no such
 * employee" is not a DomainError. The HTTP layer maps this to 404.
 */
export class EmployeeNotFoundError extends Error {
  constructor(employeeId: string) {
    super(`no employee ${employeeId}`);
    this.name = 'EmployeeNotFoundError';
  }
}
