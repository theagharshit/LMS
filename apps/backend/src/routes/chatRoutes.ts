import { Router } from 'express';
import { getContacts, getChatHistory, sendMessage, markAsRead } from '@controllers/chatController';
import { optionalAuthenticateJwt } from '@middlewares/authMiddleware';

const router = Router();

router.use(optionalAuthenticateJwt);

router.get('/contacts', getContacts);
router.post('/:contactId/read', markAsRead);
router.get('/:contactId', getChatHistory);
router.post('/:contactId', sendMessage);

export const chatRoutes = router;
