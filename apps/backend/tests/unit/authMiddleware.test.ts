import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/utils/jwtUtils';
import { authenticateJwt, requireRoles } from '../../src/middlewares/authMiddleware';

describe('JWT Utility & Middleware Test Suite', () => {
  it('should sign and verify valid JWT tokens', () => {
    const payload = {
      id: 'user-teach-1',
      name: 'Dr. Ramesh Thapa',
      email: 'ramesh.thapa@everest.edu.np',
      role: 'teacher' as const,
    };

    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.name).toBe(payload.name);
    expect(decoded.role).toBe(payload.role);
  });

  it('should reject unauthenticated requests in authenticateJwt middleware in strict mode', () => {
    process.env.ENFORCE_STRICT_JWT = 'true';
    let statusCode = 0;
    let responseBody: any = null;

    const req: any = { headers: {} };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authenticateJwt(req, res, next);
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    expect(responseBody.status).toBe('error');

    delete process.env.ENFORCE_STRICT_JWT;
  });

  it('should allow authorized role in requireRoles middleware', () => {
    const req: any = {
      user: {
        id: 'user-admin-1',
        name: 'Admin User',
        email: 'admin@everest.edu.np',
        role: 'admin',
      },
    };
    let statusCode = 0;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: () => {},
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireRoles('admin', 'teacher');
    middleware(req, res, next);

    expect(nextCalled).toBe(true);
    expect(statusCode).toBe(0);
  });

  it('should reject unauthorized role with HTTP 403 in requireRoles middleware', () => {
    const req: any = {
      user: {
        id: 'user-stu-1',
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        role: 'student',
      },
    };
    let statusCode = 0;
    let responseBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireRoles('admin');
    middleware(req, res, next);

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(responseBody.status).toBe('error');
  });
});
