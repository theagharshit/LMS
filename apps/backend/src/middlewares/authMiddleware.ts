import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUserPayload } from '@utils/jwtUtils';
import { UserRole } from '@lms/shared';
import { logger } from '@utils/logger';

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
 * In Production (or strict mode), missing/invalid tokens trigger HTTP 401 Unauthorized.
 * In Development mode, fallback demo session is provided if token is missing.
 */
export const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
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

  // If token is missing
  if (isStrictAuthMode()) {
    logger.warn(
      `[Auth] Rejected unauthenticated request to ${req.originalUrl} in Production/Strict mode`,
    );
    res.status(401).json({
      status: 'error',
      message: 'Access denied. Authentication token required in Production mode.',
    });
    return;
  }

  // Development Fallback User context
  req.user = {
    id: 'user-stu-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    role: 'student',
  };
  next();
};

/**
 * Optional authentication middleware: attaches req.user if a valid token is provided.
 */
export const optionalAuthenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
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
