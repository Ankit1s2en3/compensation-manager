import { describe, expect, it } from 'vitest';

import type { EmployeeProfileResponse, SalaryRecordResponse } from '@/api/types';

import { buildTimeline } from './timeline';

function record(
  id: string,
  effectiveFrom: string,
  amountMinor: number,
  overrides: Partial<SalaryRecordResponse> = {},
): SalaryRecordResponse {
  return {
    id,
    amount: { amountMinor, currency: 'USD', exponent: 2 },
    effectiveFrom,
    effectiveTo: null,
    changeReason: 'MERIT',
    note: null,
    supersededAt: null,
    supersededById: null,
    ...overrides,
  };
}

function profile(
  history: EmployeeProfileResponse['history'],
  upcomingRecord: SalaryRecordResponse | null = null,
): EmployeeProfileResponse {
  return {
    employee: {} as EmployeeProfileResponse['employee'],
    currentRecord: history.find((entry) => entry.isCurrent)?.record ?? null,
    upcomingRecord,
    history,
  };
}

const live = (r: SalaryRecordResponse, isCurrent = false) => ({
  record: r,
  isSuperseded: false,
  isCurrent,
});
const superseded = (r: SalaryRecordResponse) => ({ record: r, isSuperseded: true, isCurrent: false });

describe('buildTimeline', () => {
  it('marks the record in force today as current and earlier live records as past', () => {
    const hire = record('1', '2024-01-01', 100_000_00, { changeReason: 'HIRE' });
    const merit = record('2', '2025-01-01', 110_000_00);

    const entries = buildTimeline(profile([live(merit, true), live(hire)]));

    expect(entries.map((e) => e.status)).toEqual(['current', 'past']);
  });

  it('marks the server-reported upcoming record and any live record after it as upcoming', () => {
    const current = record('1', '2025-01-01', 100_000_00);
    const next = record('2', '2027-01-01', 110_000_00);
    const later = record('3', '2028-01-01', 120_000_00);

    const entries = buildTimeline(
      profile([live(later), live(next), live(current, true)], next),
    );

    expect(entries.map((e) => e.status)).toEqual(['upcoming', 'upcoming', 'current']);
  });

  it('marks a corrected record as superseded and links its correction back to it', () => {
    const original = record('1', '2025-01-01', 1_000_00, {
      changeReason: 'PROMOTION',
      supersededAt: '2025-01-03T10:00:00.000Z',
      supersededById: '2',
    });
    const correction = record('2', '2025-01-01', 100_000_00, { changeReason: 'PROMOTION' });

    const [fixed, typo] = buildTimeline(profile([live(correction, true), superseded(original)]));

    expect(typo?.status).toBe('superseded');
    expect(typo?.correctsRecordId).toBeNull();
    expect(fixed?.status).toBe('current');
    expect(fixed?.correctsRecordId).toBe('1');
    // The correction is still a promotion — CORRECTION is not a reason.
    expect(fixed?.record.changeReason).toBe('PROMOTION');
  });

  it('computes the change from the previous live record', () => {
    const hire = record('1', '2024-01-01', 100_000_00, { changeReason: 'HIRE' });
    const merit = record('2', '2025-01-01', 108_000_00);

    const [raise, first] = buildTimeline(profile([live(merit, true), live(hire)]));

    expect(raise?.changePercent).toBeCloseTo(8);
    expect(first?.changePercent).toBeNull();
  });

  it('skips superseded records when finding the previous period', () => {
    const hire = record('1', '2024-01-01', 100_000_00, { changeReason: 'HIRE' });
    const typo = record('2', '2025-01-01', 1_100_00, {
      supersededAt: '2025-01-02T00:00:00.000Z',
      supersededById: '3',
    });
    const fixed = record('3', '2025-01-01', 110_000_00);

    const [correction, original] = buildTimeline(
      profile([live(fixed, true), superseded(typo), live(hire)]),
    );

    expect(correction?.changePercent).toBeCloseTo(10);
    expect(original?.changePercent).toBeNull();
  });

  it('shows no change across a currency change — amounts are not comparable without FX', () => {
    const inUsd = record('1', '2024-01-01', 100_000_00);
    const inEur = record('2', '2025-01-01', 95_000_00, {
      amount: { amountMinor: 95_000_00, currency: 'EUR', exponent: 2 },
    });

    const [moved] = buildTimeline(profile([live(inEur, true), live(inUsd)]));

    expect(moved?.changePercent).toBeNull();
  });
});
