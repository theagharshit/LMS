import { describe, expect, it, vi } from 'vitest';
import { sanitizePayload } from '../../src/middlewares/platformMiddleware';
import { platformService } from '../../src/db/services/platformService';

const attacks = Array.from(
  { length: 100 },
  (_, index) =>
    `<script>alert(${index})</script><img src=x onerror=alert(1)>value-${index}' OR 1=1 --`,
);

describe('Input sanitization fuzz matrix (100 tests)', () => {
  it.each(attacks)('sanitizes fuzz payload %#', (attack) => {
    const request = { body: { text: attack, nested: [attack] } } as any;
    const next = vi.fn();
    sanitizePayload(request, {} as any, next);
    expect(request.body.text).not.toContain('<script>');
    expect(request.body.text).not.toContain('<img');
    expect(request.body.nested[0]).not.toContain('onerror');
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('Boundary value matrix (50 tests)', () => {
  it.each(Array.from({ length: 50 }, (_, index) => index))(
    'keeps grading and similarity bounded #%i',
    (index) => {
      const values = [-10_000, -1, 0, 0.01, 50, 99.99, 100, 101, 10_000];
      const value = values[index % values.length];
      const score = platformService.rubricScore({
        structure: value,
        content: value,
        grammar: value,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(
        platformService.similarity(index % 2 ? '' : 'same words', index % 3 ? '' : 'same words'),
      ).toBeGreaterThanOrEqual(0);
    },
  );
});
