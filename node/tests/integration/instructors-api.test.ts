import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../web/app.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('Instructors API (Fastify inject)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const db = await createInMemoryDb();
    app = await buildApp({ db, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/instructors returns ApiResponse with empty data initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/instructors' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
  });

  it('POST /api/instructors creates an instructor and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/instructors',
      payload: {
        firstMidName: 'Marie',
        lastName: 'Curie',
        hireDate: '2020-01-15',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.lastName).toBe('Curie');
  });

  it('GET /api/instructors/:id returns the created instructor', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/instructors',
      payload: { firstMidName: 'Niels', lastName: 'Bohr', hireDate: '2019-09-01' },
    });
    const id = created.json().data.id;
    const res = await app.inject({ method: 'GET', url: `/api/instructors/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.firstMidName).toBe('Niels');
  });

  it('GET /api/instructors/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/instructors/9999' });
    expect(res.statusCode).toBe(404);
    expect(res.json().success).toBe(false);
  });

  it('POST /api/instructors rejects invalid hire date with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/instructors',
      payload: { firstMidName: 'Bad', lastName: 'Date', hireDate: 'not-a-date' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });
});
