import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { getJwtSecret, signToken, verifyToken } from '../../src/utils/jwtUtils';

describe('Authentication and JWT edge matrix (30 tests)', () => {
  it.each(Array.from({ length: 30 }, (_, index) => index))(
    'rejects altered, expired, or malformed token #%i',
    (index) => {
      if (index % 3 === 0) {
        const valid = signToken({
          id: 'user-stu-1',
          name: 'Aarav',
          email: 'aarav@example.com',
          role: 'student',
        });
        expect(() =>
          verifyToken(`${valid.slice(0, -1)}${valid.endsWith('a') ? 'b' : 'a'}`),
        ).toThrow();
      } else if (index % 3 === 1) {
        const expired = jwt.sign(
          {
            id: 'user-stu-1',
            name: 'Aarav',
            email: 'aarav@example.com',
            role: 'student',
            tokenType: 'access',
          },
          getJwtSecret(),
          { expiresIn: -1, issuer: 'sikshya-lms', audience: 'sikshya-app' },
        );
        expect(() => verifyToken(expired)).toThrow(/expired/i);
      } else {
        expect(() => verifyToken(`not-a-jwt-${index}`)).toThrow();
      }
    },
  );
});
