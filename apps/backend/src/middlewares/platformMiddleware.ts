import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import { ZodType } from 'zod';
import { prisma } from '@db/services/prismaClient';
import { HttpError } from '@utils/httpError';
import { logger } from '@utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestTracing = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();
  req.requestId = String(req.headers['x-request-id'] || randomUUID());
  res.setHeader('X-Request-ID', req.requestId);
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (!res.headersSent) res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  const originalEnd = res.end.bind(res);
  res.end = ((...args: Parameters<Response['end']>) => {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (!res.headersSent) res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    return originalEnd(...args);
  }) as Response['end'];
  next();
};

const cleanValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  }
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanValue(item)]));
  }
  return value;
};

export const sanitizePayload = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') req.body = cleanValue(req.body);
  next();
};

export const validateBody =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new HttpError(
          422,
          result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; '),
          'Validation failed',
          'https://sikshya.local/problems/validation',
        ),
      );
    }
    req.body = result.data;
    next();
  };

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const existing = req.cookies?.csrf_token as string | undefined;
  const csrfToken = existing || randomBytes(24).toString('hex');
  if (!existing) {
    res.cookie('csrf_token', csrfToken, {
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  res.setHeader('X-CSRF-Token', csrfToken);
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const bearerRequest = req.headers.authorization?.startsWith('Bearer ');
  if (mutating && !bearerRequest && process.env.NODE_ENV === 'production') {
    const supplied = req.headers['x-csrf-token'];
    if (!supplied || supplied !== csrfToken) {
      return next(new HttpError(403, 'A valid CSRF token is required.', 'CSRF validation failed'));
    }
  }
  next();
};

export const requireApiKey = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const supplied = String(req.headers['x-api-key'] || '');
    if (!supplied) return next(new HttpError(401, 'X-API-Key header is required.'));
    const digest = createHash('sha256').update(supplied).digest('hex');
    const key = await prisma.apiKey.findFirst({
      where: {
        keyHash: digest,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!key) return next(new HttpError(401, 'API key is invalid or expired.'));
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (error) {
    next(error);
  }
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, `No route matches ${req.method} ${req.originalUrl}.`, 'Not Found'));
};

const routeMethods: Array<{ pattern: RegExp; methods: string[] }> = [
  { pattern: /^\/api\/health$/, methods: ['GET'] },
  { pattern: /^\/api\/auth\/(login|refresh|logout)$/, methods: ['POST'] },
  { pattern: /^\/api\/auth\/(me|csrf)$/, methods: ['GET'] },
  { pattern: /^\/api\/db\/state$/, methods: ['GET'] },
  { pattern: /^\/api\/db\/stream-posts$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/db\/students$/, methods: ['POST'] },
  { pattern: /^\/api\/db\/students\/[^/]+$/, methods: ['PUT', 'DELETE'] },
  { pattern: /^\/api\/db\/teachers$/, methods: ['POST'] },
  { pattern: /^\/api\/db\/teachers\/[^/]+$/, methods: ['PUT', 'DELETE'] },
  { pattern: /^\/api\/db\/parents$/, methods: ['POST'] },
  { pattern: /^\/api\/db\/parents\/[^/]+$/, methods: ['PUT', 'DELETE'] },
  { pattern: /^\/api\/upload$/, methods: ['POST'] },
  { pattern: /^\/api\/files(?:\/[^/]+)?$/, methods: ['GET', 'DELETE'] },
];

export const methodNotAllowed = (req: Request, res: Response, next: NextFunction) => {
  const route = routeMethods.find((candidate) => candidate.pattern.test(req.path));
  if (!route || route.methods.includes(req.method)) return next();
  res.setHeader('Allow', route.methods.join(', '));
  next(
    new HttpError(405, `${req.method} is not supported for this endpoint.`, 'Method Not Allowed'),
  );
};

export const problemDetails = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const err =
    error instanceof HttpError ? error : new HttpError(500, 'An unexpected error occurred.');
  if (!(error instanceof HttpError))
    logger.error(`[${req.requestId}] Unhandled request error`, error);
  res.status(err.status).type('application/problem+json').json({
    type: err.type,
    title: err.title,
    status: err.status,
    detail: err.message,
    instance: req.originalUrl,
    requestId: req.requestId,
  });
};

export function secureCompare(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
