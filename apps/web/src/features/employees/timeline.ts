import type { EmployeeProfileResponse, SalaryRecordResponse } from '@/api/types';

export type TimelineEntryStatus = 'current' | 'upcoming' | 'past' | 'superseded';

export interface TimelineEntry {
  record: SalaryRecordResponse;
  status: TimelineEntryStatus;
  /**
   * Id of the record this one replaced, when it is a correction. A correction
   * keeps the original's changeReason (a corrected promotion is still a
   * promotion), so this — not the reason — is how the UI tells them apart.
   */
  correctsRecordId: string | null;
  /**
   * Percent change from the previous live record. Null for the first record,
   * for superseded records, and across a currency change, where the two
   * amounts aren't comparable without an FX rate.
   */
  changePercent: number | null;
}

/**
 * Derives display state for the salary timeline from the profile, newest
 * first. Needs no clock: the server already decided what is current and
 * upcoming as of today, and every later live record is necessarily upcoming
 * too, since new changes can only be appended after the latest one.
 */
export function buildTimeline(profile: EmployeeProfileResponse): TimelineEntry[] {
  const { history, upcomingRecord } = profile;

  const correctedBy = new Map<string, string>();
  for (const { record } of history) {
    if (record.supersededById !== null) correctedBy.set(record.supersededById, record.id);
  }

  const live = history.filter((entry) => !entry.isSuperseded).map((entry) => entry.record);

  return history.map(({ record, isSuperseded, isCurrent }) => {
    let status: TimelineEntryStatus;
    if (isSuperseded) status = 'superseded';
    else if (isCurrent) status = 'current';
    else if (upcomingRecord !== null && record.effectiveFrom >= upcomingRecord.effectiveFrom)
      status = 'upcoming';
    else status = 'past';

    let changePercent: number | null = null;
    if (!isSuperseded) {
      // `live` is newest first, so the previous period is the next element.
      const previous = live[live.indexOf(record) + 1];
      if (
        previous !== undefined &&
        previous.amount.currency === record.amount.currency &&
        previous.amount.amountMinor > 0
      ) {
        changePercent =
          ((record.amount.amountMinor - previous.amount.amountMinor) /
            previous.amount.amountMinor) *
          100;
      }
    }

    return {
      record,
      status,
      correctsRecordId: correctedBy.get(record.id) ?? null,
      changePercent,
    };
  });
}
