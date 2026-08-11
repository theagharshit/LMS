import { Router } from 'express';
import {
  updateParentControls,
  sendDirectMessage,
  generateParentSummaryAi,
} from '@controllers/parentController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';

export const parentRoutes = Router();

parentRoutes.post(
  '/db/parent-controls',
  requireRolesWhenStrict('parent', 'admin'),
  updateParentControls,
);
parentRoutes.post('/db/messages', requireRolesWhenStrict('parent', 'admin'), sendDirectMessage);
parentRoutes.post(
  '/ai/parent-summary',
  requireRolesWhenStrict('parent', 'admin'),
  generateParentSummaryAi,
);
