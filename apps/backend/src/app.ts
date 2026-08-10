import express from 'express';
import { logger } from '@utils/logger';
import { authRoutes } from '@routes/authRoutes';
import { systemRoutes } from '@routes/systemRoutes';
import { studentRoutes } from '@routes/studentRoutes';
import { teacherRoutes } from '@routes/teacherRoutes';
import { parentRoutes } from '@routes/parentRoutes';
import { adminRoutes } from '@routes/adminRoutes';
import { optionalAuthenticateJwt, requireRoles } from '@middlewares/authMiddleware';

export function createApp() {
  const app = express();

  // HTTP Request Logging Middleware
  app.use(logger.httpMiddleware());

  app.use(express.json({ limit: '10mb' }));

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

  app.get('/', (_req, res) => {
    res.json({ message: 'LMS API Backend is running with JWT Authentication & RBAC Support' });
  });

  return app;
}
