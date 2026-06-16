import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import formbody from '@fastify/formbody';
import type { DbHandle } from '../infra/db.js';
import { studentsRoutes } from './routes/students-api.js';
import { coursesRoutes } from './routes/courses-api.js';
import { instructorsRoutes } from './routes/instructors-api.js';
import { pagesRoutes } from './routes/pages.js';

export interface BuildAppOptions {
  readonly db: DbHandle;
  readonly logger?: FastifyServerOptions['logger'];
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(formbody);

  await app.register(studentsRoutes, { db: opts.db });
  await app.register(coursesRoutes, { db: opts.db });
  await app.register(instructorsRoutes, { db: opts.db });
  await app.register(pagesRoutes, { db: opts.db });

  return app;
}
