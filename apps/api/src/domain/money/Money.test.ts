import { describe, it, expect } from 'vitest';

import { CurrencyMismatchError, UnknownCurrencyError } from './errors.js';
import { Money } from './Money.js';

describe('Money.of', () => {
  it('rejects an amount that is not a whole number of minor units', () => {
    expect(() => Money.of(1234.5, 'USD')).toThrow(/whole number/i);
  });

  it('rejects a currency code that is not in the exponent table', () => {
    expect(() => Money.of(1000, 'XYZ')).toThrow(UnknownCurrencyError);
  });
});

describe('Money.plus', () => {
  it('adds two amounts of the same currency', () => {
    const total = Money.of(1000, 'USD').plus(Money.of(250, 'USD'));

    expect(total.amountMinor).toBe(1250);
    expect(total.currency).toBe('USD');
  });

  it('throws CurrencyMismatchError when the two currencies differ', () => {
    expect(() => Money.of(1000, 'USD').plus(Money.of(1000, 'EUR'))).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('Money.minus', () => {
  it('subtracts within a currency but rejects a currency mismatch', () => {
    const remainder = Money.of(1000, 'USD').minus(Money.of(250, 'USD'));
    expect(remainder.amountMinor).toBe(750);

    expect(() => Money.of(1000, 'USD').minus(Money.of(1, 'JPY'))).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('Money immutability', () => {
  it('plus() returns a new instance and leaves the original untouched', () => {
    const original = Money.of(1000, 'USD');
    const result = original.plus(Money.of(500, 'USD'));

    expect(result).not.toBe(original);
    expect(original.amountMinor).toBe(1000);
  });
});

describe('Money.format', () => {
  it('places the decimal point per the currency exponent', () => {
    expect(Money.of(123456, 'USD').format()).toBe('1234.56');
    expect(Money.of(200000000, 'INR').format()).toBe('2000000.00');
  });

  it('renders a zero-exponent currency (JPY) with no decimal part', () => {
    expect(Money.of(10000000, 'JPY').format()).toBe('10000000');
  });
});
