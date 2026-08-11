import jwt from 'jsonwebtoken';
import { UserRole } from '@lms/shared';
import { randomUUID } from 'node:crypto';

export interface JwtUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jti?: string;
  tokenType?: 'access' | 'refresh' | 'student-id' | 'verification';
  deviceFingerprint?: string;
}

const DEFAULT_SECRET = 'lms_nepal_jwt_secret_key_2026';

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

export function signToken(payload: JwtUserPayload, expiresIn: string = '15m'): string {
  const claims = {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    tokenType: payload.tokenType || 'access',
  };
  return jwt.sign(claims, getJwtSecret(), {
    expiresIn: expiresIn as any,
    jwtid: payload.jti || randomUUID(),
    issuer: 'sikshya-lms',
    audience: 'sikshya-app',
  });
}

export function signRefreshToken(payload: JwtUserPayload, deviceFingerprint: string): string {
  return jwt.sign(
    {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      tokenType: 'refresh',
      deviceFingerprint,
    },
    getJwtSecret(),
    {
      expiresIn: '7d',
      jwtid: randomUUID(),
      issuer: 'sikshya-lms',
      audience: 'sikshya-refresh',
    },
  );
}

export function verifyToken(token: string, audience = 'sikshya-app'): JwtUserPayload {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'sikshya-lms',
    audience,
  }) as JwtUserPayload;
}
