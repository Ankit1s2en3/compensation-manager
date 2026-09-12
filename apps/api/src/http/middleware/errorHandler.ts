import type { ErrorRequestHandler } from 'express';
import { z, ZodError } from 'zod';

import {
  EmployeeNotFoundError,
  SalaryRecordNotFoundError,
} from '../../application/errors.js';
import { DomainError } from '../../domain/shared/DomainError.js';

/**
 * The only place in http/ that inspects an error's type. Express 5 forwards a
 * rejected handler promise here automatically — routes never call next(err).
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      fieldErrors: z.flattenError(err).fieldErrors,
    });
    return;
  }

  if (
    err instanceof EmployeeNotFoundError ||
    err instanceof SalaryRecordNotFoundError
  ) {
    res.status(404).json({ error: err.message, code: err.name });
    return;
  }

  if (err instanceof DomainError) {
    res.status(422).json({ error: err.message, code: err.name });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal error' });
};
