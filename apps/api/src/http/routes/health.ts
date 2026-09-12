import { Router } from 'express';

/** No db call — proves the process is up, nothing more. */
export function healthRoutes(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return router;
}
