import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../web/app.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('Courses API (Fastify inject)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const db = await createInMemoryDb();
    app = await buildApp({ db, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/courses returns ApiResponse with empty data initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/courses' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
    expect(body.meta?.total).toBe(0);
  });

  it('POST /api/courses creates a course and returns 201 with id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/courses',
      payload: { title: 'Calculus I', credits: 4 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.title).toBe('Calculus I');
    expect(body.data.credits).toBe(4);
  });

  it('GET /api/courses/:id returns the created course', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/courses',
      payload: { title: 'History 101', credits: 3 },
    });
    const id = created.json().data.id;
    const res = await app.inject({ method: 'GET', url: `/api/courses/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.title).toBe('History 101');
  });

  it('GET /api/courses/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/courses/9999' });
    expect(res.statusCode).toBe(404);
    expect(res.json().success).toBe(false);
  });

  it('POST /api/courses rejects invalid payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/courses',
      payload: { title: '', credits: -1 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });
});
