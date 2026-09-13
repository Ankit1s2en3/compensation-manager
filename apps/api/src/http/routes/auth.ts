import { Router } from 'express';

import type { Container } from '../../container.js';
import { loginBody } from '../schemas/auth.js';

export function authRoutes(container: Container): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const body = loginBody.parse(req.body);
    const result = await container.authenticateUser.execute(body);
    res.status(200).json(result);
  });

  return router;
}
