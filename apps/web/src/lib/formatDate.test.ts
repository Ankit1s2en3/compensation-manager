import { describe, expect, it } from 'vitest';

import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('renders the same calendar day the ISO string names, not the UTC-shifted one', () => {
    // Regression case: new Date('2026-04-01') parses as UTC midnight, which
    // is Mar 31 in any timezone west of UTC (e.g. US timezones). This test
    // is only meaningful run somewhere west of UTC, but the fix (parsing as
    // local midnight) is timezone-independent either way.
    expect(formatDate('2026-04-01')).toBe('Apr 1, 2026');
  });

  it('renders the first day of the month correctly', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('renders the last day of the year correctly', () => {
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
  });
});
