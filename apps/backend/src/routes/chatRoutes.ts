import { Router } from 'express';
import { getContacts, getChatHistory, sendMessage, markAsRead } from '@controllers/chatController';
import { authenticateJwt } from '@middlewares/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/contacts', getContacts);
router.post('/:contactId/read', markAsRead);
router.get('/:contactId', getChatHistory);
router.post('/:contactId', sendMessage);

export const chatRoutes = router;
