import Redis from 'ioredis';
import { logger } from '@utils/logger';

type CacheEntry = { value: string; expiresAt: number };
const memoryCache = new Map<string, CacheEntry>();

const redis =
  process.env.REDIS_URL && process.env.NODE_ENV !== 'test'
    ? new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;
let redisUnavailable = false;

async function redisClient() {
  if (!redis || redisUnavailable) return null;
  try {
    if (redis.status === 'wait') await redis.connect();
    return redis;
  } catch (error) {
    redisUnavailable = true;
    logger.warn(`[Cache] Redis unavailable; using in-process cache: ${(error as Error).message}`);
    return null;
  }
}

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const client = await redisClient();
    const raw = client
      ? await client.get(key)
      : (() => {
          const entry = memoryCache.get(key);
          if (!entry || entry.expiresAt <= Date.now()) {
            memoryCache.delete(key);
            return null;
          }
          return entry.value;
        })();
    return raw ? (JSON.parse(raw) as T) : null;
  },

  async set(key: string, value: unknown, ttlSeconds = 60) {
    const raw = JSON.stringify(value);
    const client = await redisClient();
    if (client) await client.set(key, raw, 'EX', ttlSeconds);
    else memoryCache.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async invalidate(...keys: string[]) {
    const client = await redisClient();
    if (client && keys.length) await client.del(...keys);
    keys.forEach((key) => memoryCache.delete(key));
  },

  async close() {
    if (redis && redis.status !== 'end') await redis.quit().catch(() => redis.disconnect());
  },
};
