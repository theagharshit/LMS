import express from 'express';
import { loadEnv } from '@utils/envResolver';
loadEnv();

import { logger } from '@utils/logger';
import { createApp } from './src/app';
import { disconnectDatabase } from '@db/services/prismaClient';
import { cacheService } from '@db/services/cacheService';
import { startBackgroundJobs } from '@utils/backgroundJobs';
import { closeRealtime, initializeRealtime } from '@utils/realtime';

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3001;

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info(`Environment: ${logger.getEnvironment()} | Log Level: ${logger.getLogLevel()}`);
  });
  initializeRealtime(server);
  const stopJobs = startBackgroundJobs();

  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}; gracefully shutting down.`);
    stopJobs();
    const forceTimer = setTimeout(() => process.exit(1), 10_000);
    forceTimer.unref();
    await closeRealtime();
    server.close(async () => {
      await Promise.allSettled([cacheService.close(), disconnectDatabase()]);
      clearTimeout(forceTimer);
      process.exit(exitCode);
    });
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
    void shutdown('unhandledRejection', 1);
  });
  process.once('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    void shutdown('uncaughtException', 1);
  });
}

startServer();
