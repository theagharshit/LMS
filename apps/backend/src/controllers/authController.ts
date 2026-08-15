import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { signToken } from '@utils/jwtUtils';
import { logger } from '@utils/logger';
import { createHash } from 'node:crypto';
import { authService } from '@db/services/authService';
import { passwordHashService } from '@utils/passwordHashService';
import { prisma } from '@db/services/prismaClient';
import { isStrictAuthMode } from '@middlewares/authMiddleware';

const getFingerprint = (req: Request) =>
  String(
    req.headers['x-device-fingerprint'] ||
      createHash('sha256')
        .update(String(req.headers['user-agent'] || 'unknown'))
        .digest('hex'),
  );

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearRefreshCookie = (res: Response) => {
  const { maxAge: _maxAge, ...clearOptions } = refreshCookieOptions;
  res.clearCookie('refresh_token', clearOptions);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email, password } = req.body;

    if (userId && isStrictAuthMode()) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    const allUsers = await lmsDB.getUsers();
    const user = allUsers.find((u) => (userId && u.id === userId) || (email && u.email === email));

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User account not found.',
      });
      return;
    }

    const credential = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, isArchived: true },
    });
    if (credential?.isArchived) {
      res.status(403).json({ status: 'error', message: 'This account is archived.' });
      return;
    }
    if (isStrictAuthMode() && !credential?.passwordHash) {
      res.status(403).json({
        status: 'error',
        message: 'This account has no password credential. Contact an administrator.',
      });
      return;
    }
    const maintenance = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });
    if (maintenance?.value === true && user.role !== 'admin') {
      res
        .status(503)
        .json({ status: 'error', message: 'The LMS is temporarily in maintenance mode.' });
      return;
    }
    if (user.role === 'student') {
      const settings = await prisma.parentControlSettings.findUnique({
        where: { studentId: user.id },
      });
      if (settings?.blackoutStart && settings.blackoutEnd) {
        const now = new Intl.DateTimeFormat('en-GB', {
          timeZone: settings.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());
        const wraps = settings.blackoutStart > settings.blackoutEnd;
        const blocked = wraps
          ? now >= settings.blackoutStart || now < settings.blackoutEnd
          : now >= settings.blackoutStart && now < settings.blackoutEnd;
        if (blocked) {
          res.status(403).json({
            status: 'error',
            message: `Student access is disabled from ${settings.blackoutStart} to ${settings.blackoutEnd}.`,
          });
          return;
        }
      }
    }
    if (
      credential?.passwordHash &&
      (!password || !(await passwordHashService.verify(password, credential.passwordHash)))
    ) {
      res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const session = await authService.issueSession(payload, getFingerprint(req), req.ip);
    res.cookie('refresh_token', session.refreshToken, refreshCookieOptions);

    logger.info(`[Auth] Issued JWT token for user '${user.name}' (${user.role})`);

    res.json({
      status: 'success',
      token: session.accessToken,
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user,
    });
  } catch (err) {
    logger.error('Failed to authenticate user:', err);
    res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
};

export const refreshSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ status: 'error', message: 'Refresh token required.' });
      return;
    }
    const session = await authService.rotate(refreshToken, getFingerprint(req), req.ip);
    res.cookie('refresh_token', session.refreshToken, refreshCookieOptions);
    res.json({
      status: 'success',
      token: session.accessToken,
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
    });
  } catch (error) {
    logger.warn(`[Auth] Refresh rejected: ${(error as Error).message}`);
    clearRefreshCookie(res);
    res.status(401).json({ status: 'error', message: 'Refresh token is invalid or expired.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  await Promise.all([
    authService.revokeRefreshToken(req.cookies?.refresh_token),
    accessToken ? authService.revokeAccessToken(accessToken) : Promise.resolve(),
  ]);
  clearRefreshCookie(res);
  res.json({ status: 'success', message: 'Session revoked.' });
};

export const getCsrfToken = (req: Request, res: Response) => {
  res.json({
    status: 'success',
    csrfToken: req.cookies?.csrf_token || res.getHeader('X-CSRF-Token'),
  });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  const user = (await lmsDB.getUsers()).find((candidate) => candidate.id === req.user!.id);
  if (!user) {
    res.status(404).json({ status: 'error', message: 'Active user account not found.' });
    return;
  }
  res.json({ status: 'success', user });
};
