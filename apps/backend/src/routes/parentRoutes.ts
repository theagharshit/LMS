import { Router } from 'express';
import {
  updateParentControls,
  sendDirectMessage,
  generateParentSummaryAi,
} from '@controllers/parentController';

export const parentRoutes = Router();

parentRoutes.post('/db/parent-controls', updateParentControls);
parentRoutes.post('/db/messages', sendDirectMessage);
parentRoutes.post('/ai/parent-summary', generateParentSummaryAi);
