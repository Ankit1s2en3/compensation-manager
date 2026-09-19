/**
 * Hand-written response types mirroring apps/api/src/http/responses/* and the
 * application-layer shapes those serializers wrap. Kept in sync by hand — the
 * API has no shared package with the frontend, so this file is the seam. If
 * these drift from the server, a Supertest-verified shape on the backend
 * won't save you here; watch for 500s that are actually "field renamed".
 */

export interface MoneyResponse {
  amountMinor: number;
  currency: string;
  exponent: number;
}

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type ChangeReason = 'HIRE' | 'MERIT' | 'PROMOTION' | 'MARKET_ADJUSTMENT';

/** A directory row — GET /api/employees `items[]`. */
export interface EmployeeListItemResponse {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  jobLevelId: string;
  countryCode: string;
  status: EmployeeStatus;
  currentSalary: MoneyResponse | null;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /api/employees/:id `.employee`. */
export interface EmployeeResponse {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  jobLevelId: string;
  jobTitle: string;
  countryCode: string;
  employmentType: EmploymentType;
  hireDate: string;
  managerId: string | null;
  status: EmployeeStatus;
}

export interface SalaryRecordResponse {
  id: string;
  amount: MoneyResponse;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: ChangeReason;
  note: string | null;
  supersededAt: string | null;
  supersededById: string | null;
}

export interface EmployeeProfileResponse {
  employee: EmployeeResponse;
  currentRecord: SalaryRecordResponse | null;
  upcomingRecord: SalaryRecordResponse | null;
  history: Array<{
    record: SalaryRecordResponse;
    isSuperseded: boolean;
    isCurrent: boolean;
  }>;
}

export interface AuthenticatedUserResponse {
  id: string;
  email: string;
  role: string;
}

/** POST /api/auth/login response body. */
export interface LoginResponse {
  token: string;
  user: AuthenticatedUserResponse;
}

/** GET /api/employees query params — also the URL search param names. */
export interface EmployeeListQuery {
  department?: string;
  country?: string;
  level?: string;
  status?: EmployeeStatus;
  q?: string;
  limit?: number;
  offset?: number;
}
