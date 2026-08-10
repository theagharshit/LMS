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
  getNotificationPreferences,
  updateNotificationPreferences,
  dispatchCustomNotification,
} from '@controllers/systemController';

export const systemRoutes = Router();

systemRoutes.get('/health', getHealth);
systemRoutes.get('/db/state', getDbState);
systemRoutes.post('/upload', verifyFileIntegrity, uploadFile);
systemRoutes.get('/files', getAllFiles);
systemRoutes.get('/files/:id', getFileById);
systemRoutes.delete('/files/:id', deleteFile);

// Notification API Routes
systemRoutes.get('/db/notifications/:userId', getUserNotifications);
systemRoutes.post('/db/notifications/:id/read', markNotificationAsRead);
systemRoutes.post('/db/notifications/read-all', markAllNotificationsAsRead);
systemRoutes.get('/db/notification-preferences/:userId', getNotificationPreferences);
systemRoutes.put('/db/notification-preferences/:userId', updateNotificationPreferences);
systemRoutes.post('/db/notifications/dispatch', dispatchCustomNotification);
