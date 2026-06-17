import { Router } from 'express';
import { listerServices, tousLesServices, creerService, supprimerService } from '../controllers/services.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', tousLesServices);
router.get('/:entrepriseId', listerServices);
router.post('/', requireAuth, requireRole('ENTREPRISE'), creerService);
router.delete('/:id', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), supprimerService);

export default router;
