import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../web/app.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('SSR pages (Fastify inject)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const db = await createInMemoryDb();
    app = await buildApp({ db, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / serves the home page HTML', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Contoso University');
  });

  it('GET /students renders an empty table', async () => {
    const res = await app.inject({ method: 'GET', url: '/students' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<table');
    expect(res.body).toContain('Enrollment date');
  });

  it('GET /students/create renders the new-student form', async () => {
    const res = await app.inject({ method: 'GET', url: '/students/create' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<form');
    expect(res.body).toContain('name="enrollmentDate"');
  });

  it('POST /students/create with all fields redirects to /students', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/students/create',
      payload: 'firstMidName=Ada&lastName=Lovelace&enrollmentDate=2024-09-01',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/students');
  });

  it('POST /students/create with missing fields returns 400 HTML error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/students/create',
      payload: 'firstMidName=Ada',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('All fields required');
  });

  it('GET /courses renders the courses table', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Credits');
  });

  it('GET /instructors renders the instructors table', async () => {
    const res = await app.inject({ method: 'GET', url: '/instructors' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Hire date');
  });

  it('renders persisted students in the table after creation', async () => {
    await app.inject({
      method: 'POST',
      url: '/students/create',
      payload: 'firstMidName=Grace&lastName=Hopper&enrollmentDate=2024-09-01',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    const res = await app.inject({ method: 'GET', url: '/students' });
    expect(res.body).toContain('Hopper');
  });
});
