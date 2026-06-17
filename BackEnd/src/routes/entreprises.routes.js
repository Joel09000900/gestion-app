import { Router } from 'express';
import { listerEntreprisesParType, monEntreprise, statsEntreprise, tousLesTickets, updateEntrepriseAvatar, updateEntrepriseProfile } from '../controllers/entreprises.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', listerEntreprisesParType); // public, ?type=coiffure
router.get('/moi', requireAuth, requireRole('ENTREPRISE'), monEntreprise);
router.get('/stats', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), statsEntreprise);
router.get('/tickets', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), tousLesTickets);
router.patch('/avatar', requireAuth, requireRole('ENTREPRISE'), updateEntrepriseAvatar);
router.patch('/profil', requireAuth, requireRole('ENTREPRISE'), updateEntrepriseProfile);

export default router;
