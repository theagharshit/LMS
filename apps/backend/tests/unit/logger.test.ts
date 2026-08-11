import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../../src/utils/logger';
describe('Logger Utility (src/utils/logger.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it('should initialize with environment and log level getters', () => {
    expect(logger.getEnvironment()).toBeDefined();
    expect(logger.getLogLevel()).toBeDefined();
    expect(typeof logger.isVerbose()).toBe('boolean');
    expect(typeof logger.isDev()).toBe('boolean');
  });
  it('should output info logs without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test Info Message');
    expect(consoleSpy).toHaveBeenCalled();
  });
  it('should output warning logs', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Test Warning Message');
    expect(consoleSpy).toHaveBeenCalled();
  });
  it('should output error logs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test Error Message', new Error('Sample Failure'));
    expect(consoleSpy).toHaveBeenCalled();
  });
  it('should return a valid Express HTTP middleware function', () => {
    const middleware = logger.httpMiddleware();
    expect(typeof middleware).toBe('function');
    const req: any = { method: 'GET', url: '/api/health', headers: {} };
    const res: any = { statusCode: 200, on: vi.fn((event, cb) => cb()) };
    const next = vi.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
