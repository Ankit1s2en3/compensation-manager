import { describe, it, expect } from 'vitest';

import { SalaryTimeline } from './SalaryTimeline.js';

describe('SalaryTimeline.recordChange', () => {
  it('accepts the first change for an employee', () => {
    const timeline = new SalaryTimeline({ hireDate: '2023-01-01', records: [] });

    const updated = timeline.recordChange({
      amountMinor: 1_500_000,
      currency: 'INR',
      effectiveFrom: '2023-01-01',
      changeReason: 'HIRE',
      note: null,
    });

    expect(updated.records).toHaveLength(1);
    expect(updated.records[0]).toMatchObject({
      amountMinor: 1_500_000,
      currency: 'INR',
      effectiveFrom: '2023-01-01',
      effectiveTo: null,
      changeReason: 'HIRE',
    });
  });
});
