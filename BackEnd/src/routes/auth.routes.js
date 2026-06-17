import { Router } from 'express';
import { inscription, connexion, me, updateAvatar } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/me', requireAuth, me);
router.patch('/avatar', requireAuth, updateAvatar);

export default router;
