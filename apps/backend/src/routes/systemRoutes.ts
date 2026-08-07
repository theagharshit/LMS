import { Router } from 'express';
import { verifyFileIntegrity } from '@middlewares/fileMiddleware';
import {
  getHealth,
  getDbState,
  uploadFile,
  getAllFiles,
  getFileById,
  deleteFile,
} from '@controllers/systemController';

export const systemRoutes = Router();

systemRoutes.get('/health', getHealth);
systemRoutes.get('/db/state', getDbState);
systemRoutes.post('/upload', verifyFileIntegrity, uploadFile);
systemRoutes.get('/files', getAllFiles);
systemRoutes.get('/files/:id', getFileById);
systemRoutes.delete('/files/:id', deleteFile);
