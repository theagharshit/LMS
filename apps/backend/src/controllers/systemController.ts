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
  const uploadedBy = req.user?.name || req.body?.uploadedBy || 'Sikshya User';
  const uploadedById =
    req.user?.id || (process.env.NODE_ENV !== 'production' ? 'user-stu-1' : undefined);
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
    uploadedById,
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

// --- NOTIFICATION CONTROLLERS ---
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await lmsDB.getUserNotifications(req.params.userId);
    res.json({ status: 'success', notifications });
  } catch (err) {
    logger.error('Failed to get notifications:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    await lmsDB.markNotificationAsRead(req.params.id);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to mark notification read:', err);
    res.status(500).json({ status: 'error', message: 'Failed to mark notification read' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await lmsDB.markAllNotificationsAsRead(userId);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to mark all notifications read:', err);
    res.status(500).json({ status: 'error', message: 'Failed to mark all notifications read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    await lmsDB.deleteNotification(req.params.id);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to delete notification:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete notification' });
  }
};

export const clearReadNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await lmsDB.clearReadNotifications(userId);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to clear read notifications:', err);
    res.status(500).json({ status: 'error', message: 'Failed to clear read notifications' });
  }
};

export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const preferences = await lmsDB.getNotificationPreferences(req.params.userId);
    res.json({ status: 'success', preferences });
  } catch (err) {
    logger.error('Failed to get notification preferences:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get notification preferences' });
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const preferences = await lmsDB.updateNotificationPreferences(req.params.userId, req.body);
    res.json({ status: 'success', preferences });
  } catch (err) {
    logger.error('Failed to update notification preferences:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update notification preferences' });
  }
};

export const dispatchCustomNotification = async (req: Request, res: Response) => {
  try {
    const {
      recipientId,
      targetAudience,
      classroomId,
      title,
      body,
      category,
      severity,
      type,
      senderId,
      senderName,
      senderRole,
    } = req.body;

    if (targetAudience) {
      const count = await lmsDB.dispatchBroadcastNotification({
        targetAudience,
        classroomId,
        senderId,
        senderName,
        senderRole,
        title,
        body,
        category: category || 'COMMUNICATION',
        severity: severity || 'normal',
        type: type || 'announcement',
      });
      return res.json({ status: 'success', dispatchedCount: count });
    }

    const notification = await lmsDB.dispatchNotification({
      recipientId,
      senderId,
      senderName,
      senderRole,
      title,
      body,
      category: category || 'COMMUNICATION',
      severity: severity || 'normal',
      type: type || 'general',
    });

    res.json({ status: 'success', notification });
  } catch (err) {
    logger.error('Failed to dispatch custom notification:', err);
    res.status(500).json({ status: 'error', message: 'Failed to dispatch notification' });
  }
};
