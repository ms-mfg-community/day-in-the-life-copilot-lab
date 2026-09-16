import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createInstructorRepo } from '../../infra/repos/instructor-repo.js';
import type { DbHandle } from '../../infra/db.js';
import { ok, fail } from '../api-response.js';

const newInstructorSchema = z.object({
  firstMidName: z.string().min(1),
  lastName: z.string().min(1),
  hireDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'invalid date'),
});

export interface InstructorsRoutesOpts {
  readonly db: DbHandle;
}

export const instructorsRoutes: FastifyPluginAsync<InstructorsRoutesOpts> = async (
  app: FastifyInstance,
  opts,
) => {
  const repo = createInstructorRepo(opts.db);

  app.get('/api/instructors', async (_req, reply) => {
    const all = await repo.list();
    reply.code(200).send(ok(all, { total: all.length }));
  });

  app.get<{ Params: { id: string } }>('/api/instructors/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const found = await repo.getById(id);
    if (!found) {
      reply.code(404).send(fail(`Instructor ${id} not found`));
      return;
    }
    reply.code(200).send(ok(found));
  });

  app.post('/api/instructors', async (req, reply) => {
    const parsed = newInstructorSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send(fail(parsed.error.issues.map((i) => i.message).join('; ')));
      return;
    }
    const created = await repo.create({
      firstMidName: parsed.data.firstMidName,
      lastName: parsed.data.lastName,
      hireDate: new Date(parsed.data.hireDate),
    });
    reply.code(201).send(ok(created));
  });
};
