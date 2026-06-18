import { Router } from 'express';
import { inscription, connexion, me, updateAvatar, supprimerCompte } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/me', requireAuth, me);
router.patch('/avatar', requireAuth, updateAvatar);
router.delete('/compte', requireAuth, supprimerCompte);

export default router;
