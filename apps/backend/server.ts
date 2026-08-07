import express from 'express';
import { loadEnv } from '@utils/envResolver';
loadEnv();

import { logger } from '@utils/logger';
import { systemRoutes } from '@routes/systemRoutes';
import { studentRoutes } from '@routes/studentRoutes';
import { teacherRoutes } from '@routes/teacherRoutes';
import { parentRoutes } from '@routes/parentRoutes';
import { adminRoutes } from '@routes/adminRoutes';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // HTTP Request Logging Middleware
  app.use(logger.httpMiddleware());

  app.use(express.json({ limit: '10mb' }));

  // Mount Modular Domain API Routers under /api
  app.use('/api', systemRoutes);
  app.use('/api', studentRoutes);
  app.use('/api', teacherRoutes);
  app.use('/api', parentRoutes);
  app.use('/api', adminRoutes);

  app.get('/', (_req, res) => {
    res.json({ message: 'LMS API Backend is running' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info(`Environment: ${logger.getEnvironment()} | Log Level: ${logger.getLogLevel()}`);
  });
}

startServer();
