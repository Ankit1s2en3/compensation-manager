/**
 * Minor-unit exponent per currency. Table-driven on purpose: the number of minor
 * units in a major unit varies (JPY has none), so `* 100` is never assumed.
 */
export const CURRENCY_EXPONENTS = {
  USD: 2,
  INR: 2,
  EUR: 2,
  GBP: 2,
  SGD: 2,
  BRL: 2,
  JPY: 0,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS;

export class UnknownCurrencyError extends Error {
  constructor(code: string) {
    super(`Unknown currency code: ${code}`);
    this.name = 'UnknownCurrencyError';
  }
}

export function exponentOf(code: string): number {
  if (!(code in CURRENCY_EXPONENTS)) {
    throw new UnknownCurrencyError(code);
  }
  return CURRENCY_EXPONENTS[code as CurrencyCode];
}
