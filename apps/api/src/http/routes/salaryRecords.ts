import { Router } from 'express';

import type { Container } from '../container.js';
import { toSalaryRecordResponse } from '../responses/employees.js';
import { correctionBody } from '../schemas/salaryRecords.js';

export function salaryRecordRoutes(container: Container): Router {
  const router = Router();

  router.post('/:id/corrections', async (req, res) => {
    const body = correctionBody.parse(req.body);
    const record = await container.correctSalaryRecord.execute({
      recordId: req.params.id,
      ...body,
    });
    res.status(201).json(toSalaryRecordResponse(record));
  });

  return router;
}
