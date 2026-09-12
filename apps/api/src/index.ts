import { db } from './infrastructure/db.js';
import { createContainer } from './http/container.js';
import { createServer } from './http/server.js';

const port = Number(process.env.PORT ?? 3000);
const app = createServer(createContainer(db));

app.listen(port, () => {
  console.log(`compensation-manager api listening on :${port}`);
});
