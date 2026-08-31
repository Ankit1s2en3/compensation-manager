/**
 * Why an employee's pay changed.
 *
 * Deliberately NOT a home for CORRECTION: a correction copies the original
 * record's reason so a corrected promotion still counts as a promotion
 * (docs/data-model.md §2). What marks a record as a correction is that another
 * record supersedes it, not a reason code.
 */
export const CHANGE_REASONS = [
  'HIRE',
  'MERIT',
  'PROMOTION',
  'MARKET_ADJUSTMENT',
] as const;

export type ChangeReason = (typeof CHANGE_REASONS)[number];
