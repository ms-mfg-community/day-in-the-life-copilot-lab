import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createCourseRepo } from '../../infra/repos/course-repo.js';
import type { DbHandle } from '../../infra/db.js';
import { ok, fail } from '../api-response.js';

const newCourseSchema = z.object({
  title: z.string().min(1),
  credits: z.number().int().min(0),
  departmentId: z.number().int().nullable().optional(),
});

export interface CoursesRoutesOpts {
  readonly db: DbHandle;
}

export const coursesRoutes: FastifyPluginAsync<CoursesRoutesOpts> = async (
  app: FastifyInstance,
  opts,
) => {
  const repo = createCourseRepo(opts.db);

  app.get('/api/courses', async (_req, reply) => {
    const all = await repo.list();
    reply.code(200).send(ok(all, { total: all.length }));
  });

  app.get<{ Params: { id: string } }>('/api/courses/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const found = await repo.getById(id);
    if (!found) {
      reply.code(404).send(fail(`Course ${id} not found`));
      return;
    }
    reply.code(200).send(ok(found));
  });

  app.post('/api/courses', async (req, reply) => {
    const parsed = newCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send(fail(parsed.error.issues.map((i) => i.message).join('; ')));
      return;
    }
    const created = await repo.create(parsed.data);
    reply.code(201).send(ok(created));
  });
};
