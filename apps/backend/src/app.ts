import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { logger } from '@utils/logger';
import { authRoutes } from '@routes/authRoutes';
import { systemRoutes } from '@routes/systemRoutes';
import { studentRoutes } from '@routes/studentRoutes';
import { teacherRoutes } from '@routes/teacherRoutes';
import { parentRoutes } from '@routes/parentRoutes';
import { adminRoutes } from '@routes/adminRoutes';
import { optionalAuthenticateJwt, requireRoles } from '@middlewares/authMiddleware';
import {
  csrfProtection,
  notFound,
  methodNotAllowed,
  problemDetails,
  requestTracing,
  sanitizePayload,
} from '@middlewares/platformMiddleware';
import { metricsMiddleware } from '@middlewares/metricsMiddleware';
import { openApiDocument } from '@utils/openApi';
import { platformRoutes } from '@routes/platformRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('etag', 'strong');
  app.set('trust proxy', 1);

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin is not allowed by CORS policy.'));
      },
    }),
  );
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(compression({ threshold: 1024 }));
  app.use(cookieParser());
  app.use(requestTracing);
  app.use(metricsMiddleware);

  // HTTP Request Logging Middleware
  app.use(logger.httpMiddleware());

  app.use(express.json({ limit: '2mb', strict: true }));
  app.use(csrfProtection);
  app.use(sanitizePayload);

  app.use(
    '/api/db',
    rateLimit({
      windowMs: 60 * 1000,
      limit: process.env.NODE_ENV === 'test' ? 10_000 : 100,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // Public Auth Routes
  app.use('/api', authRoutes);

  // Apply JWT extraction middleware to all subsequent /api routes
  app.use('/api', optionalAuthenticateJwt);

  // Mount Modular Domain API Routers under /api
  app.use('/api', systemRoutes);
  app.use('/api', studentRoutes);
  app.use('/api', teacherRoutes);
  app.use('/api', parentRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', platformRoutes);

  app.get('/', (_req, res) => {
    res.json({ message: 'LMS API Backend is running with JWT Authentication & RBAC Support' });
  });

  app.use(methodNotAllowed);
  app.use(notFound);
  app.use(problemDetails);

  return app;
}
