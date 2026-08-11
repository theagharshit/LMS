import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { signToken } from '@utils/jwtUtils';
import { logger } from '@utils/logger';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email } = req.body;

    const allUsers = await lmsDB.getUsers();
    const user = allUsers.find((u) => (userId && u.id === userId) || (email && u.email === email));

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User account not found.',
      });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = signToken(payload);

    logger.info(`[Auth] Issued JWT token for user '${user.name}' (${user.role})`);

    res.json({
      status: 'success',
      token,
      user,
    });
  } catch (err) {
    logger.error('Failed to authenticate user:', err);
    res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  res.json({
    status: 'success',
    user: req.user,
  });
};
