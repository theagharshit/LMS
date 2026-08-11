import jwt from 'jsonwebtoken';
import { UserRole } from '@lms/shared';

export interface JwtUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const DEFAULT_SECRET = 'lms_nepal_jwt_secret_key_2026';

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

export function signToken(payload: JwtUserPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JwtUserPayload {
  return jwt.verify(token, getJwtSecret()) as JwtUserPayload;
}
