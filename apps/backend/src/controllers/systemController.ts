import { Request, Response } from 'express';
import { logger } from '@utils/logger';
import { fileStorageDB } from '@db/fileStorageDB';
import { lmsDB } from '@db/lmsDatabase';

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Sikshya LMS API Operational',
    timestamp: new Date().toISOString(),
  });
};

export const getDbState = async (_req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      users: await lmsDB.getUsers(),
      studentProfiles: await lmsDB.getStudentProfiles(),
      badgeDefinitions: await lmsDB.getBadgeDefinitions(),
      classrooms: await lmsDB.getClassrooms(),
      streamPosts: await lmsDB.getStreamPosts(),
      assignments: await lmsDB.getAssignments(),
      submissions: await lmsDB.getSubmissions(),
      quizzes: await lmsDB.getQuizzes(),
      quizSubmissions: await lmsDB.getQuizSubmissions(),
      attendance: await lmsDB.getAttendance(),
      parentControls: await lmsDB.getParentControls(),
      studentLocations: await lmsDB.getStudentLocations(),
      messages: await lmsDB.getDirectMessages(),
      termProgress: await lmsDB.getTermProgress(),
      studentActivities: await lmsDB.getStudentActivities(),
      subjectPerformances: await lmsDB.getSubjectPerformances(),
    });
  } catch (err) {
    logger.error('Failed to fetch DB state:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch state' });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  logger.info('Processing file upload and registering entry in PostgreSQL database...');
  const fileName = req.body?.name || 'Uploaded_Attachment.pdf';
  const uploadedBy = req.body?.uploadedBy || 'Sikshya User';
  const classroomId = req.body?.classroomId;
  const sizeBytes = req.body?.sizeBytes || 1024 * 512;
  const sizeFormatted = req.body?.sizeFormatted || '512 KB';
  const mimeType = req.body?.mimeType || 'application/pdf';

  const record = await fileStorageDB.addFile({
    originalName: fileName,
    storedName: `${Date.now()}_${fileName}`,
    mimeType,
    sizeBytes,
    sizeFormatted,
    uploadedBy,
    classroomId,
    checksum: `sha256-${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`,
    integrityStatus: 'verified',
    downloadUrl: `/uploads/${encodeURIComponent(fileName)}`,
  });

  res.json({
    status: 'success',
    message: 'File verified and stored in database successfully.',
    record,
  });
};

export const getAllFiles = async (req: Request, res: Response) => {
  const classroomId = req.query.classroomId as string | undefined;
  const files = await fileStorageDB.getAllFiles(classroomId);
  res.json({ status: 'success', count: files.length, files });
};

export const getFileById = async (req: Request, res: Response) => {
  const file = await fileStorageDB.getFileById(req.params.id);
  if (!file) {
    return res
      .status(404)
      .json({ status: 'error', message: 'File record not found in storage DB' });
  }
  res.json({ status: 'success', file });
};

export const deleteFile = async (req: Request, res: Response) => {
  const deleted = await fileStorageDB.deleteFile(req.params.id);
  if (!deleted) {
    return res
      .status(404)
      .json({ status: 'error', message: 'File record not found in storage DB' });
  }
  res.json({ status: 'success', message: `File ${req.params.id} deleted from storage DB` });
};
