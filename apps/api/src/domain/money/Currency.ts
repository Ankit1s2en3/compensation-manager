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

export function exponentOf(code: string): number {
  return CURRENCY_EXPONENTS[code as CurrencyCode];
}
