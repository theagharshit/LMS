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

// Student Controllers
export const createStudent = async (req: Request, res: Response) => {
  try {
    const student = await lmsDB.addStudentProfile(req.body);
    res.json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to create student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create student' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await lmsDB.updateStudentProfile(id, req.body);
    res.json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to update student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update student' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteStudentProfile(id);
    res.json({ status: 'success', message: 'Student archived' });
  } catch (err) {
    logger.error('Failed to delete student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete student' });
  }
};

// Teacher Controllers
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const teacher = await lmsDB.addTeacherProfile(req.body);
    res.json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to create teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create teacher' });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await lmsDB.updateTeacherProfile(id, req.body);
    res.json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to update teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update teacher' });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteTeacherProfile(id);
    res.json({ status: 'success', message: 'Teacher deactivated' });
  } catch (err) {
    logger.error('Failed to delete teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete teacher' });
  }
};

// Parent Controllers
export const createParent = async (req: Request, res: Response) => {
  try {
    const parent = await lmsDB.addParentProfile(req.body);
    res.json({ status: 'success', parent });
  } catch (err) {
    logger.error('Failed to create parent:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create parent' });
  }
};

export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteParentProfile(id);
    res.json({ status: 'success', message: 'Parent deleted' });
  } catch (err) {
    logger.error('Failed to delete parent:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete parent' });
  }
};

// Badge Definition Controllers
export const createBadgeDefinition = async (req: Request, res: Response) => {
  try {
    const badge = await lmsDB.createBadgeDefinition(req.body);
    res.json({ status: 'success', badge });
  } catch (err) {
    logger.error('Failed to create badge definition:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create badge definition' });
  }
};

export const deleteBadgeDefinition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteBadgeDefinition(id);
    res.json({ status: 'success', message: 'Badge definition deleted' });
  } catch (err) {
    logger.error('Failed to delete badge definition:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete badge definition' });
  }
};

// Classroom Controllers
export const deleteClassroom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteClassroom(id);
    res.json({ status: 'success', message: 'Classroom deleted' });
  } catch (err) {
    logger.error('Failed to delete classroom:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete classroom' });
  }
};
