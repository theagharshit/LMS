import express from 'express';
import { loadEnv } from '@utils/envResolver';
loadEnv();

import { logger } from '@utils/logger';
import { createApp } from './src/app';

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3001;

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info(`Environment: ${logger.getEnvironment()} | Log Level: ${logger.getLogLevel()}`);
  });
}

startServer();
