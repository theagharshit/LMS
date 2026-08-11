import { describe, expect, it, vi } from 'vitest';
import type { UserRole } from '@lms/shared';
import { requireRoles } from '../../src/middlewares/authMiddleware';
const roles: UserRole[] = ['admin', 'teacher', 'student', 'parent'];
const personas: Array<UserRole | 'principal'> = [
  'admin',
  'teacher',
  'student',
  'parent',
  'principal',
];
const policies = Array.from({ length: 40 }, (_, index) => ({
  endpoint: `/api/generated/endpoint-${index + 1}`,
  allowed:
    index % 4 === 0
      ? roles
      : index % 4 === 1
        ? (['admin', 'teacher'] as UserRole[])
        : index % 4 === 2
          ? (['admin', 'parent'] as UserRole[])
          : (['admin', 'student'] as UserRole[]),
}));
describe('Parameterized 40 endpoint × 5 persona RBAC matrix (200 tests)', () => {
  it.each(policies.flatMap((policy) => personas.map((persona) => ({ ...policy, persona }))))(
    '$persona permission for $endpoint',
    ({ endpoint, allowed, persona }) => {
      const role: UserRole = persona === 'principal' ? 'admin' : persona;
      const status = vi.fn().mockReturnThis();
      const json = vi.fn();
      const next = vi.fn();
      requireRoles(...allowed)(
        {
          user: { id: `persona-${persona}`, name: persona, email: `${persona}@example.com`, role },
          originalUrl: endpoint,
        } as any,
        { status, json } as any,
        next,
      );
      if (allowed.includes(role)) expect(next).toHaveBeenCalledOnce();
      else {
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledOnce();
      }
    },
  );
});
