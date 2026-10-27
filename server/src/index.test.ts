import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';

describe('app routes', () => {
  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  it('GET /health returns 200 { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('includes helmet security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /api/contributions/:username with a bad year returns structured 400 JSON', async () => {
    const res = await request(app).get('/api/contributions/octocat?year=1990');
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('GET /api/contributions/:username with no token returns structured 500 JSON', async () => {
    const res = await request(app).get('/api/contributions/octocat');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('GITHUB_TOKEN is not configured on the server');
  });
});
