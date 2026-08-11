import { Router } from 'express';
import { verifyFileIntegrity } from '@middlewares/fileMiddleware';
import {
  getHealth,
  getDbState,
  uploadFile,
  getAllFiles,
  getFileById,
  deleteFile,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  dispatchCustomNotification,
} from '@controllers/systemController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';

export const systemRoutes = Router();

systemRoutes.get('/health', getHealth);
systemRoutes.get(
  '/db/state',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  getDbState,
);
systemRoutes.post(
  '/upload',
  requireRolesWhenStrict('student', 'teacher', 'admin'),
  verifyFileIntegrity,
  uploadFile,
);
systemRoutes.get('/files', requireRolesWhenStrict('student', 'teacher', 'admin'), getAllFiles);
systemRoutes.get('/files/:id', requireRolesWhenStrict('student', 'teacher', 'admin'), getFileById);
systemRoutes.delete('/files/:id', requireRolesWhenStrict('teacher', 'admin'), deleteFile);

// Notification API Routes
systemRoutes.get(
  '/db/notifications/:userId',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  getUserNotifications,
);
systemRoutes.post(
  '/db/notifications/:id/read',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  markNotificationAsRead,
);
systemRoutes.post(
  '/db/notifications/read-all',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  markAllNotificationsAsRead,
);
systemRoutes.delete(
  '/db/notifications/:id',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  deleteNotification,
);
systemRoutes.post(
  '/db/notifications/clear-read',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  clearReadNotifications,
);
systemRoutes.get(
  '/db/notification-preferences/:userId',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  getNotificationPreferences,
);
systemRoutes.put(
  '/db/notification-preferences/:userId',
  requireRolesWhenStrict('student', 'teacher', 'parent', 'admin'),
  updateNotificationPreferences,
);
systemRoutes.post(
  '/db/notifications/dispatch',
  requireRolesWhenStrict('teacher', 'admin'),
  dispatchCustomNotification,
);
