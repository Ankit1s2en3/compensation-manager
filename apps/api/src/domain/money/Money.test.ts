import { describe, it, expect } from 'vitest';

import { Money } from './Money.js';

describe('Money.of', () => {
  it('rejects an amount that is not a whole number of minor units', () => {
    expect(() => Money.of(1234.5, 'USD')).toThrow(/whole number/i);
  });
});
