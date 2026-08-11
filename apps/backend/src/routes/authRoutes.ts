import { Router } from 'express';
import { login, getMe } from '@controllers/authController';
import { authenticateJwt } from '@middlewares/authMiddleware';

export const authRoutes = Router();

authRoutes.post('/auth/login', login);
authRoutes.get('/auth/me', authenticateJwt, getMe);
