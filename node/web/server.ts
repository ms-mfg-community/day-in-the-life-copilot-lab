import { buildApp } from './app.js';
import { createInMemoryDb } from '../infra/db.js';
import { seed } from '../infra/seed.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  const db = await createInMemoryDb();
  await seed(db);
  const app = await buildApp({ db, logger: { level: 'info' } });
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Contoso (Node) listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
