import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUserPayload } from '@utils/jwtUtils';
import { UserRole } from '@lms/shared';
import { logger } from '@utils/logger';
import { authService } from '@db/services/authService';
import { prisma } from '@db/services/prismaClient';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/**
 * Central Environment Flag for Strict JWT Authentication.
 * Returns true if NODE_ENV === 'production' or ENFORCE_STRICT_JWT === 'true'.
 */
export const isStrictAuthMode = (): boolean => {
  return process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_JWT === 'true';
};

/**
 * Middleware to enforce a valid JWT token on protected routes.
 * Missing or invalid tokens trigger HTTP 401 Unauthorized.
 */
export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      if (payload.tokenType !== 'access' || (await authService.isRevoked(payload.jti))) {
        throw new Error('Token has been revoked or has an invalid type.');
      }
      req.user = payload;
      const currentIp = req.ip;
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { lastSessionIp: true, isArchived: true },
      });
      if (user?.isArchived) throw new Error('Account is archived.');
      if (user?.lastSessionIp && currentIp && user.lastSessionIp !== currentIp) {
        await prisma.securityAudit.create({
          data: {
            userId: payload.id,
            event: 'session-ip-changed',
            severity: 'high',
            ipAddress: currentIp,
            requestId: req.requestId,
            metadata: { previousIp: user.lastSessionIp },
          },
        });
        logger.warn(`[Security] Session IP changed for user '${payload.id}'`);
      }
      await prisma.user.updateMany({
        where: { id: payload.id },
        data: { lastSessionIp: currentIp, lastActiveAt: new Date() },
      });
      return next();
    } catch (err) {
      logger.warn(`[Auth] Invalid JWT token attempt: ${(err as Error).message}`);
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired authentication token.',
      });
      return;
    }
  }

  logger.warn(`[Auth] Rejected unauthenticated request to ${req.originalUrl}`);
  res.status(401).json({
    status: 'error',
    message: 'Access denied. Authentication token required.',
  });
};

/**
 * Optional authentication middleware: attaches req.user if a valid token is provided.
 */
export const optionalAuthenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      if (payload.tokenType === 'access' && !(await authService.isRevoked(payload.jti)))
        req.user = payload;
    } catch {
      // Ignore invalid optional tokens
    }
  }
  next();
};

/**
 * Middleware to enforce role-based access control (RBAC).
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `[RBAC] Access denied for user '${req.user.id}' (${req.user.role}) to ${req.originalUrl}. Allowed roles: ${allowedRoles.join(', ')}`,
      );
      res.status(403).json({
        status: 'error',
        message: `Forbidden. Role '${req.user.role}' is not authorized to perform this action.`,
      });
      return;
    }

    next();
  };
};

/** Enforces authentication/RBAC in every environment. */
export const requireRolesWhenStrict = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isStrictAuthMode()) return requireRoles(...allowedRoles)(req, res, next);
    authenticateJwt(req, res, (error?: unknown) => {
      if (error) return next(error);
      requireRoles(...allowedRoles)(req, res, next);
    });
  };
};
