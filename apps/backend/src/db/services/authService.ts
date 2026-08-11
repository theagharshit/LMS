import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './prismaClient';
import { JwtUserPayload, signRefreshToken, signToken, verifyToken } from '@utils/jwtUtils';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthService {
  async issueSession(payload: JwtUserPayload, deviceFingerprint: string, ipAddress?: string) {
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload, deviceFingerprint);
    await prisma.refreshToken.create({
      data: {
        userId: payload.id,
        tokenHash: hashToken(refreshToken),
        deviceFingerprint,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }

  async rotate(refreshToken: string, deviceFingerprint: string, ipAddress?: string) {
    const payload = verifyToken(refreshToken, 'sikshya-refresh');
    if (payload.tokenType !== 'refresh' || payload.deviceFingerprint !== deviceFingerprint) {
      throw new Error('Refresh token does not match this device.');
    }
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!record || record.revokedAt || record.expiresAt <= new Date()) {
      throw new Error('Refresh token is expired or revoked.');
    }
    const session = await this.issueSession(payload, deviceFingerprint, ipAddress);
    const replacement = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(session.refreshToken) },
      select: { id: true },
    });
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedById: replacement?.id },
    });
    return session;
  }

  async revokeRefreshToken(token?: string) {
    if (!token) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAccessToken(token: string, reason = 'logout') {
    const decoded = jwt.decode(token) as (JwtUserPayload & { exp?: number; jti?: string }) | null;
    if (!decoded?.jti || !decoded.exp) return;
    await prisma.tokenRevocation.upsert({
      where: { jti: decoded.jti },
      update: { reason, expiresAt: new Date(decoded.exp * 1000) },
      create: {
        jti: decoded.jti,
        userId: decoded.id,
        reason,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });
  }

  async isRevoked(jti?: string) {
    if (!jti) return false;
    return Boolean(
      await prisma.tokenRevocation.findFirst({
        where: { jti, expiresAt: { gt: new Date() } },
        select: { id: true },
      }),
    );
  }

  async revokeAllForUser(userId: string, reason = 'role-change') {
    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.securityAudit.create({
        data: { userId, event: 'all-sessions-revoked', severity: 'high', metadata: { reason } },
      }),
    ]);
  }
}

export const authService = new AuthService();
