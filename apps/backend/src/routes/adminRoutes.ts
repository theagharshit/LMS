import { Router } from 'express';
import {
  assignStudentBadge,
  getAllStudentLocations,
} from '@controllers/adminController';

export const adminRoutes = Router();

adminRoutes.post('/db/student-badges', assignStudentBadge);
adminRoutes.get('/db/student-locations', getAllStudentLocations);
