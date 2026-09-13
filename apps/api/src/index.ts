import { createContainer } from './container.js';
import { db } from './infrastructure/db.js';
import { loadJwtSecret } from './infrastructure/jwtSecret.js';
import { createServer } from './http/server.js';

// Fail fast: a missing or (in production) still-placeholder JWT_SECRET
// throws here, before the server ever accepts a request.
const jwtSecret = loadJwtSecret();

const port = Number(process.env.PORT ?? 3000);
const app = createServer(createContainer(db, jwtSecret), jwtSecret);

app.listen(port, () => {
  console.log(`compensation-manager api listening on :${port}`);
});
