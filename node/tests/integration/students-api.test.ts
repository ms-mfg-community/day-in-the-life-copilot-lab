import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../web/app.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('Students API (Fastify inject)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const db = await createInMemoryDb();
    app = await buildApp({ db, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/students returns ApiResponse with empty data initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/students' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
  });

  it('POST /api/students creates a student and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/students',
      payload: {
        firstMidName: 'Ada',
        lastName: 'Lovelace',
        enrollmentDate: '2024-09-01',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.lastName).toBe('Lovelace');
  });

  it('PUT /api/students/:id updates a student', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/students',
      payload: { firstMidName: 'Grace', lastName: 'Hopper', enrollmentDate: '2024-09-01' },
    });
    const id = created.json().data.id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/students/${id}`,
      payload: { lastName: 'Hopper-Murray' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.lastName).toBe('Hopper-Murray');
  });

  it('DELETE /api/students/:id removes a student', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/students',
      payload: { firstMidName: 'Alan', lastName: 'Turing', enrollmentDate: '2024-09-01' },
    });
    const id = created.json().data.id;
    const del = await app.inject({ method: 'DELETE', url: `/api/students/${id}` });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/api/students/${id}` });
    expect(get.statusCode).toBe(404);
    expect(get.json().success).toBe(false);
  });

  it('POST /api/students rejects invalid payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/students',
      payload: { lastName: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });
});
