import { describe, it, expect } from 'vitest';

import { exponentOf } from './Currency.js';

describe('Currency exponent table', () => {
  it('returns the minor-unit exponent for each supported currency', () => {
    expect(exponentOf('USD')).toBe(2);
    expect(exponentOf('INR')).toBe(2);
    expect(exponentOf('EUR')).toBe(2);
    expect(exponentOf('GBP')).toBe(2);
    expect(exponentOf('SGD')).toBe(2);
    expect(exponentOf('BRL')).toBe(2);
    expect(exponentOf('JPY')).toBe(0);
  });
});
