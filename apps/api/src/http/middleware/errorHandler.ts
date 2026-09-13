import type { ErrorRequestHandler } from 'express';
import { z, ZodError } from 'zod';

import {
  EmployeeNotFoundError,
  InvalidCredentialsError,
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

  // Order matters: this block must stay before the DomainError check below.
  // EmployeeNotFoundError and SalaryRecordNotFoundError currently extend
  // plain Error (application/errors.ts), not DomainError, so today the two
  // blocks can't actually collide — but if either is ever changed to extend
  // DomainError (e.g. for a uniform error hierarchy), the DomainError check
  // would catch it first if it came first, and a 404 would silently become a
  // 422. Keep the more specific check above the more general one regardless.
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

  // Also plain Error, also deliberately not a DomainError — see the comment
  // above the 404 block. Same "no such email" and "wrong password" get the
  // same status and message, so a caller can't tell which one occurred.
  if (err instanceof InvalidCredentialsError) {
    res.status(401).json({ error: err.message, code: err.name });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal error' });
};
