import { describe, expect, it } from 'vitest';

import { formatMoney } from './formatMoney';

describe('formatMoney', () => {
  it('renders JPY with no decimals (exponent 0)', () => {
    expect(formatMoney({ amountMinor: 500_000, currency: 'JPY', exponent: 0 })).toBe(
      '¥500,000',
    );
  });

  it('renders INR with two decimals (exponent 2)', () => {
    expect(formatMoney({ amountMinor: 123_456, currency: 'INR', exponent: 2 })).toBe(
      '₹1,234.56',
    );
  });

  it('renders USD with two decimals (exponent 2)', () => {
    expect(formatMoney({ amountMinor: 999_990, currency: 'USD', exponent: 2 })).toBe(
      '$9,999.90',
    );
  });

  it('renders KWD with three decimals (exponent 3)', () => {
    // "KWD" and the amount are joined by a non-breaking space (U+00A0), not
    // a regular space — Intl's own choice for a currency with no glyph.
    expect(formatMoney({ amountMinor: 1_000, currency: 'KWD', exponent: 3 })).toBe(
      'KWD 1.000',
    );
  });
});
