import { Router } from 'express';
import { login, getMe, refreshSession, logout, getCsrfToken } from '@controllers/authController';
import { authenticateJwt } from '@middlewares/authMiddleware';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validateBody } from '@middlewares/platformMiddleware';

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1_000 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts. Please try again later.' },
});

authRoutes.get('/auth/csrf', getCsrfToken);
authRoutes.post(
  '/auth/login',
  loginLimiter,
  validateBody(
    z
      .object({
        userId: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).max(128).optional(),
      })
      .refine((body) => Boolean(body.userId || body.email), 'userId or email is required'),
  ),
  login,
);
authRoutes.post('/auth/refresh', refreshSession);
authRoutes.post('/auth/logout', logout);
authRoutes.get('/auth/me', authenticateJwt, getMe);
