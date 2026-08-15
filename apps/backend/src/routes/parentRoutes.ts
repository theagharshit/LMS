import { Router } from 'express';
import {
  updateParentControls,
  sendDirectMessage,
  getPendingStudentMessages,
  reviewStudentMessage,
  generateParentSummaryAi,
} from '@controllers/parentController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';
import { validateBody } from '@middlewares/platformMiddleware';
import { z } from 'zod';

export const parentRoutes = Router();

parentRoutes.post(
  '/db/parent-controls',
  requireRolesWhenStrict('parent', 'admin'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      settings: z
        .object({
          allowTeacherDirectChat: z.boolean().optional(),
          allowPeerDiscussion: z.boolean().optional(),
          missingHomeworkAlerts: z.boolean().optional(),
          lowAttendanceAlerts: z.boolean().optional(),
          weeklyDigestEmail: z.boolean().optional(),
          screenTimeLimitMinutes: z.number().int().min(0).max(1_440).optional(),
          requireApprovalForOutboundMsgs: z.boolean().optional(),
          blackoutStart: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .nullable()
            .optional(),
          blackoutEnd: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .nullable()
            .optional(),
          timezone: z.string().trim().min(1).max(100).optional(),
        })
        .refine(
          (settings) => Object.keys(settings).length > 0,
          'At least one setting is required.',
        ),
    }),
  ),
  updateParentControls,
);
parentRoutes.post(
  '/db/messages',
  requireRolesWhenStrict('parent', 'admin'),
  validateBody(
    z.object({
      receiverId: z.string().min(1),
      content: z.string().trim().min(1).max(10_000),
    }),
  ),
  sendDirectMessage,
);
parentRoutes.get(
  '/db/messages/pending-approval',
  requireRolesWhenStrict('parent', 'admin'),
  getPendingStudentMessages,
);
parentRoutes.patch(
  '/db/messages/:id/approval',
  requireRolesWhenStrict('parent', 'admin'),
  validateBody(z.object({ decision: z.enum(['approved', 'rejected']) })),
  reviewStudentMessage,
);
parentRoutes.post(
  '/ai/parent-summary',
  requireRolesWhenStrict('parent', 'admin'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      language: z.string().trim().min(1).max(80).optional(),
    }),
  ),
  generateParentSummaryAi,
);
