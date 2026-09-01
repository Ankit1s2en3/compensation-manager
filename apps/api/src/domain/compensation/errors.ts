import { DomainError } from '../shared/DomainError.js';

/** I3: effective_from must be on or after the employee's hire date. */
export class EffectiveDateBeforeHireError extends DomainError {
  constructor(attempted: string, hireDate: string) {
    super(`effective date ${attempted} is before the hire date ${hireDate}`);
  }
}

/** I5: a record may be superseded at most once. */
export class AlreadyCorrectedError extends DomainError {
  constructor(recordId: string) {
    super(`salary record ${recordId} has already been corrected`);
  }
}

/** I8: a change must start strictly after the latest live record's effective_from. */
export class RetroactiveChangeError extends DomainError {
  constructor(attempted: string, latestLive: string) {
    super(
      `a salary change must start after the latest live record (${latestLive}); got ${attempted}`,
    );
  }
}

/** I9: a correction may change the amount and the note, and nothing else. */
export class CorrectionCurrencyMismatchError extends DomainError {
  constructor(recordId: string, was: string, got: string) {
    super(
      `salary record ${recordId} is in ${was}; a correction cannot change its currency to ${got}`,
    );
  }
}
