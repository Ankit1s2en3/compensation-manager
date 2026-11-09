import type { ChangeReason, EmploymentType } from '@/api/types';

export const CHANGE_REASON_LABELS: Record<ChangeReason, string> = {
  HIRE: 'Hire',
  MERIT: 'Merit increase',
  PROMOTION: 'Promotion',
  MARKET_ADJUSTMENT: 'Market adjustment',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
};
