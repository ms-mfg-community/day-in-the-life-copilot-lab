import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createStudentRepo } from '../../infra/repos/student-repo.js';
import { createCourseRepo } from '../../infra/repos/course-repo.js';
import { createInstructorRepo } from '../../infra/repos/instructor-repo.js';
import type { DbHandle } from '../../infra/db.js';
import { layout, html } from '../views/layout.js';

export interface PagesOpts {
  readonly db: DbHandle;
}

export const pagesRoutes: FastifyPluginAsync<PagesOpts> = async (
  app: FastifyInstance,
  opts,
) => {
  const studentRepo = createStudentRepo(opts.db);
  const courseRepo = createCourseRepo(opts.db);
  const instructorRepo = createInstructorRepo(opts.db);

  app.get('/', async (_req, reply) => {
    reply
      .type('text/html')
      .send(
        layout(
          'Welcome',
          `<p>Contoso University (Node track). Pick a section above.</p>`,
        ),
      );
  });

  app.get('/students', async (_req, reply) => {
    const all = await studentRepo.list();
    const rows = all
      .map(
        (s) =>
          `<tr><td>${s.id}</td><td>${html.escape(s.firstMidName)}</td><td>${html.escape(s.lastName)}</td><td>${s.enrollmentDate.toISOString().slice(0, 10)}</td></tr>`,
      )
      .join('');
    reply.type('text/html').send(
      layout(
        'Students',
        `
        <p><a href="/students/create">Create New</a></p>
        <table>
          <thead><tr><th>ID</th><th>First name</th><th>Last name</th><th>Enrollment date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
      ),
    );
  });

  app.get('/students/create', async (_req, reply) => {
    reply.type('text/html').send(
      layout(
        'Create Student',
        `
        <form method="POST" action="/students/create">
          <label for="firstMidName">First name</label>
          <input id="firstMidName" name="firstMidName" required />
          <label for="lastName">Last name</label>
          <input id="lastName" name="lastName" required />
          <label for="enrollmentDate">Enrollment date</label>
          <input id="enrollmentDate" name="enrollmentDate" type="date" required />
          <button type="submit">Create</button>
        </form>
      `,
      ),
    );
  });

  app.post<{
    Body: { firstMidName?: string; lastName?: string; enrollmentDate?: string };
  }>('/students/create', async (req, reply) => {
    const { firstMidName, lastName, enrollmentDate } = req.body ?? {};
    if (!firstMidName || !lastName || !enrollmentDate) {
      reply.code(400).type('text/html').send(layout('Error', '<p>All fields required.</p>'));
      return;
    }
    await studentRepo.create({
      firstMidName,
      lastName,
      enrollmentDate: new Date(enrollmentDate),
    });
    reply.redirect('/students');
  });

  app.get('/courses', async (_req, reply) => {
    const all = await courseRepo.list();
    const rows = all
      .map(
        (c) =>
          `<tr><td>${c.id}</td><td>${html.escape(c.title)}</td><td>${c.credits}</td></tr>`,
      )
      .join('');
    reply.type('text/html').send(
      layout(
        'Courses',
        `<table>
          <thead><tr><th>ID</th><th>Title</th><th>Credits</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`,
      ),
    );
  });

  app.get('/instructors', async (_req, reply) => {
    const all = await instructorRepo.list();
    const rows = all
      .map(
        (i) =>
          `<tr><td>${i.id}</td><td>${html.escape(i.firstMidName)}</td><td>${html.escape(i.lastName)}</td><td>${i.hireDate.toISOString().slice(0, 10)}</td></tr>`,
      )
      .join('');
    reply.type('text/html').send(
      layout(
        'Instructors',
        `<table>
          <thead><tr><th>ID</th><th>First name</th><th>Last name</th><th>Hire date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`,
      ),
    );
  });
};
