import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';
import { postgresPool } from '@db/services/prismaClient';

client.collectDefaultMetrics({ prefix: 'sikshya_' });

const httpDuration = new client.Histogram({
  name: 'sikshya_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

for (const [name, help, read] of [
  [
    'sikshya_db_pool_total_connections',
    'Total PostgreSQL pool connections',
    () => postgresPool.totalCount,
  ],
  [
    'sikshya_db_pool_idle_connections',
    'Idle PostgreSQL pool connections',
    () => postgresPool.idleCount,
  ],
  [
    'sikshya_db_pool_waiting_requests',
    'Requests waiting for a PostgreSQL connection',
    () => postgresPool.waitingCount,
  ],
] as const) {
  new client.Gauge({
    name,
    help,
    collect() {
      this.set(read());
    },
  });
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = httpDuration.startTimer();
  res.on('finish', () =>
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: String(res.statusCode),
    }),
  );
  next();
};

export const metricsRegistry = client.register;
