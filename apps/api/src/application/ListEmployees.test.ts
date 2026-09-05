import { describe, expect, it } from 'vitest';

import { ListEmployees } from './ListEmployees.js';
import { FixedClock } from './testing/FixedClock.js';
import { InMemoryEmployeeRepository } from './testing/InMemoryEmployeeRepository.js';
import { anEmployee } from './testing/builders.js';

describe('ListEmployees', () => {
  it('passes clock.today() through to the repository search', async () => {
    const employees = new InMemoryEmployeeRepository([
      anEmployee({ id: '1', departmentId: '1' }),
      anEmployee({ id: '2', departmentId: '2' }),
    ]);
    const useCase = new ListEmployees(employees, new FixedClock('2026-03-15'));

    const result = await useCase.execute(
      { departmentId: '1' },
      { limit: 25, offset: 0 },
    );

    expect(employees.searchCalls).toHaveLength(1);
    expect(employees.searchCalls[0]).toEqual({
      criteria: { departmentId: '1' },
      page: { limit: 25, offset: 0 },
      on: '2026-03-15',
    });
    expect(result.items.map((i) => i.id)).toEqual(['1']);
  });
});
