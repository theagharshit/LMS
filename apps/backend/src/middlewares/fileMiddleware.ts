import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware: verifyFileIntegrity
 *
 * Checks file name extensions and security flags before processing uploads.
 */
export const verifyFileIntegrity = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('Executing verifyFileIntegrity middleware for incoming file...');

  const isMalicious = req.body?.name?.endsWith('.exe') || req.body?.isMalicious === true;

  if (isMalicious) {
    logger.warn('File rejected by integrity check!');
    res.status(403).json({ error: 'File failed integrity and safety checks.' });
    return;
  }

  logger.debug('File passed integrity checks.');
  next();
};
