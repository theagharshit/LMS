import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { logger } from '@utils/logger';

export const assignStudentBadge = async (req: Request, res: Response) => {
  try {
    const { studentProfileId, badgeDefinitionId, assignedBy, remarks } = req.body;
    if (!studentProfileId || !badgeDefinitionId || !assignedBy) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    const badge = await lmsDB.assignBadge(studentProfileId, badgeDefinitionId, assignedBy, remarks);
    res.json({ status: 'success', badge });
  } catch (err) {
    logger.error('Failed to assign badge:', err);
    res.status(500).json({ status: 'error', message: 'Failed to assign badge' });
  }
};

export const getAllStudentLocations = async (_req: Request, res: Response) => {
  try {
    const studentLocations = await lmsDB.getStudentLocations();
    res.json({ status: 'success', studentLocations });
  } catch (err) {
    logger.error('Failed to get student locations:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get student locations' });
  }
};
