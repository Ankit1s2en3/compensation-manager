import { DomainError } from '../shared/DomainError.js';

/** The currency code is not in the exponent table (docs/data-model.md §2). */
export class UnknownCurrencyError extends DomainError {
  constructor(code: string) {
    super(`Unknown currency code: ${code}`);
  }
}

/** An operation combined two Money values in different currencies. */
export class CurrencyMismatchError extends DomainError {
  constructor(left: string, right: string) {
    super(`Cannot combine Money in ${left} with Money in ${right}`);
  }
}
