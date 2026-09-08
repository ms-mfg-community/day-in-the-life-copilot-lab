import { buildApp } from './app.js';
import { openApplicationDb } from '../infra/application-db.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  const db = await openApplicationDb(process.env.CONTOSO_SQLITE_PATH);
  const app = await buildApp({ db, logger: { level: 'info' } });
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Contoso (Node) listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
