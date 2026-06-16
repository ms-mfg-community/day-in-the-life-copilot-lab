import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createStudentRepo } from '../../infra/repos/student-repo.js';
import type { DbHandle } from '../../infra/db.js';
import { ok, fail } from '../api-response.js';

const newStudentSchema = z.object({
  firstMidName: z.string().min(1),
  lastName: z.string().min(1),
  enrollmentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'invalid date'),
});

const patchStudentSchema = z.object({
  firstMidName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  enrollmentDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'invalid date')
    .optional(),
});

export interface StudentsRoutesOpts {
  readonly db: DbHandle;
}

export const studentsRoutes: FastifyPluginAsync<StudentsRoutesOpts> = async (
  app: FastifyInstance,
  opts,
) => {
  const repo = createStudentRepo(opts.db);

  app.get('/api/students', async (_req, reply) => {
    const all = await repo.list();
    reply.code(200).send(ok(all, { total: all.length }));
  });

  app.get<{ Params: { id: string } }>('/api/students/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      reply.code(400).send(fail('id must be a number'));
      return;
    }
    const found = await repo.getById(id);
    if (!found) {
      reply.code(404).send(fail(`Student ${id} not found`));
      return;
    }
    reply.code(200).send(ok(found));
  });

  app.post('/api/students', async (req, reply) => {
    const parsed = newStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send(fail(parsed.error.issues.map((i) => i.message).join('; ')));
      return;
    }
    const created = await repo.create({
      firstMidName: parsed.data.firstMidName,
      lastName: parsed.data.lastName,
      enrollmentDate: new Date(parsed.data.enrollmentDate),
    });
    reply.code(201).send(ok(created));
  });

  app.put<{ Params: { id: string } }>('/api/students/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      reply.code(400).send(fail('id must be a number'));
      return;
    }
    const parsed = patchStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send(fail(parsed.error.issues.map((i) => i.message).join('; ')));
      return;
    }
    const existing = await repo.getById(id);
    if (!existing) {
      reply.code(404).send(fail(`Student ${id} not found`));
      return;
    }
    const updated = await repo.update(id, {
      firstMidName: parsed.data.firstMidName,
      lastName: parsed.data.lastName,
      enrollmentDate: parsed.data.enrollmentDate
        ? new Date(parsed.data.enrollmentDate)
        : undefined,
    });
    reply.code(200).send(ok(updated));
  });

  app.delete<{ Params: { id: string } }>('/api/students/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      reply.code(400).send(fail('id must be a number'));
      return;
    }
    const existing = await repo.getById(id);
    if (!existing) {
      reply.code(404).send(fail(`Student ${id} not found`));
      return;
    }
    await repo.delete(id);
    reply.code(204).send();
  });
};
