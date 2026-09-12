import { Router } from 'express';

import type { Container } from '../../container.js';
import { compensationStatsQuery } from '../schemas/analytics.js';

export function analyticsRoutes(container: Container): Router {
  const router = Router();

  router.get('/compensation', async (req, res) => {
    const { groupBy, filters } = compensationStatsQuery.parse(req.query);
    const rows = await container.getCompensationStats.execute(groupBy, filters);
    res.json(rows);
  });

  return router;
}
