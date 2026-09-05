import { exponentOf } from '../../domain/money/Currency.js';

/** Matches `.env` BASE_CURRENCY and the seed. Change here if the base moves. */
export const BASE_CURRENCY = 'USD';

/**
 * data-model.md §4:
 *   amount_base_minor = round(amount_minor × rate × 10^(baseExp − srcExp))
 *
 * The multiply is the one place a float is allowed in this system. Math.round
 * immediately after — every downstream sum and average is integer arithmetic.
 */
export function fxToBaseMinor(
  amountMinor: number,
  currency: string,
  rate: number,
): number {
  const srcExp = exponentOf(currency);
  const baseExp = exponentOf(BASE_CURRENCY);
  return Math.round(amountMinor * rate * 10 ** (baseExp - srcExp));
}
