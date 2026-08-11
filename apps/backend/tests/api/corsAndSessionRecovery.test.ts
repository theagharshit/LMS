import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
const originalNodeEnv = process.env.NODE_ENV;
const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
});
describe.sequential('cross-environment request hardening', () => {
  it('allows configured production preview origins with credentials', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'http://localhost:4173,http://127.0.0.1:4173';
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'http://127.0.0.1:4173');
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
  it('returns a traced RFC 7807 response for a rejected origin', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'http://localhost:4173';
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');
    expect(response.status).toBe(403);
    expect(response.type).toBe('application/problem+json');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      type: 'https://sikshya.local/problems/cors',
      title: 'Cross-origin request blocked',
      status: 403,
      requestId: response.headers['x-request-id'],
    });
  });
  it('expires an invalid refresh cookie so browsers stop replaying it', async () => {
    process.env.NODE_ENV = 'test';
    const response = await request(createApp())
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=invalid-token');
    expect(response.status).toBe(401);
    const cookies = String(response.headers['set-cookie']);
    expect(cookies).toContain('refresh_token=;');
    expect(cookies).toContain('Path=/api/auth');
  });
});
