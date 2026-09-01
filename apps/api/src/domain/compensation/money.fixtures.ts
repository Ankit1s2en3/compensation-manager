import { Money } from '../money/Money.js';

/**
 * Rupees as an INR Money. INR has exponent 2, so paise = rupees * 100.
 * `inr(2_000_000)` → 200_000_000 paise = Rs 20,00,000.
 */
export function inr(rupees: number): Money {
  return Money.of(rupees * 100, 'INR');
}

/**
 * Yen as a JPY Money. JPY has exponent 0 — there are no minor units, so the yen
 * figure is already the minor-unit count. `jpy(9_000_000)` → ¥9,000,000.
 */
export function jpy(yen: number): Money {
  return Money.of(yen, 'JPY');
}
