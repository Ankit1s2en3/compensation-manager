/**
 * Application-layer "not found" errors. The domain has no Employee concept and
 * the salary record id in a URL is a routing detail, not a domain fact — so
 * these are not DomainErrors. The HTTP layer maps them to 404.
 */
export class EmployeeNotFoundError extends Error {
  constructor(employeeId: string) {
    super(`no employee ${employeeId}`);
    this.name = 'EmployeeNotFoundError';
  }
}

export class SalaryRecordNotFoundError extends Error {
  constructor(recordId: string) {
    super(`no salary record ${recordId}`);
    this.name = 'SalaryRecordNotFoundError';
  }
}

/**
 * Thrown for both "no such email" and "wrong password" — deliberately the
 * same error, same message, for both. Telling a caller which one occurred
 * would tell them which emails exist. Maps to 401.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}
