/**
 * Stand-in for a future /api/departments and /api/job-levels lookup endpoint.
 * The seed data (apps/api/src/seed) fixes these ids deterministically; until
 * the API exposes them, the directory screen needs somewhere to turn an id
 * into a name. Hardcoded here instead of a new backend endpoint, per the
 * "nothing else" scope for this task.
 */
export const DEPARTMENT_NAMES: Record<string, string> = {
  '1': 'Engineering',
  '2': 'Sales',
  '3': 'Support',
  '4': 'Finance',
  '5': 'HR',
};

export const JOB_LEVEL_NAMES: Record<string, string> = {
  '1': 'L1 Junior',
  '2': 'L2 Associate',
  '3': 'L3 Mid',
  '4': 'L4 Senior',
  '5': 'L5 Staff',
  '6': 'L6 Principal',
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  SG: 'Singapore',
  JP: 'Japan',
  BR: 'Brazil',
};

export function departmentName(id: string): string {
  return DEPARTMENT_NAMES[id] ?? id;
}

export function jobLevelName(id: string): string {
  return JOB_LEVEL_NAMES[id] ?? id;
}

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
