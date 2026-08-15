import { describe, it, expect, vi } from 'vitest';
import { verifyFileIntegrity } from '../../src/middlewares/fileMiddleware';
describe('File Integrity Middleware (src/middlewares/fileMiddleware.ts)', () => {
  it('should pass valid files to next() middleware', () => {
    const req: any = { body: { name: 'valid_assignment.pdf', sizeBytes: 1024 } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    verifyFileIntegrity(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
