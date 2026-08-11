import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware: verifyFileIntegrity
 *
 * Checks file name extensions and security flags before processing uploads.
 */
export const verifyFileIntegrity = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('Executing verifyFileIntegrity middleware for incoming file...');

  const fileName = String(req.body?.name || 'Uploaded_Attachment.pdf');
  const extension = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  const allowedExtensions = new Set(['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.csv']);
  const sizeBytes = Number(req.body?.sizeBytes || 0);
  const isMalicious =
    !extension ||
    !allowedExtensions.has(extension) ||
    sizeBytes > 25 * 1024 * 1024 ||
    sizeBytes < 0 ||
    req.body?.isMalicious === true;

  if (isMalicious) {
    logger.warn('File rejected by integrity check!');
    res.status(415).json({ error: 'Only PDF, DOCX, PNG, and JPG files up to 25MB are accepted.' });
    return;
  }

  logger.debug('File passed integrity checks.');
  next();
};
