import { exponentOf } from '../../domain/money/Currency.js';
import type { Money } from '../../domain/money/Money.js';

export interface MoneyResponse {
  amountMinor: number;
  currency: string;
  exponent: number;
}

/**
 * The one place Money is serialised. Never a float, never a pre-formatted
 * string — React does the formatting, using amountMinor and exponent.
 */
export function toMoneyResponse(money: Money): MoneyResponse {
  return {
    amountMinor: money.amountMinor,
    currency: money.currency,
    exponent: exponentOf(money.currency),
  };
}
