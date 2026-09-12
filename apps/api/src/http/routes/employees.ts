import { Router } from 'express';

import type { Container } from '../container.js';
import {
  toEmployeeListItemResponse,
  toEmployeeProfileResponse,
} from '../responses/employees.js';
import { employeeListQuery } from '../schemas/employees.js';

export function employeeRoutes(container: Container): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { criteria, page } = employeeListQuery.parse(req.query);
    const result = await container.listEmployees.execute(criteria, page);

    res.json({
      items: result.items.map(toEmployeeListItemResponse),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  });

  router.get('/:id', async (req, res) => {
    const profile = await container.getEmployeeProfile.execute(req.params.id);
    res.json(toEmployeeProfileResponse(profile));
  });

  return router;
}
