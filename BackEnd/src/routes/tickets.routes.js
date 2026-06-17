import { Router } from 'express';
import { prendreTicket, mesTickets, tousLesTicketsAdmin, supprimerHistorique, supprimerTicket, fileAttente, appelTicket, terminerTicket, validerTicket, refuserTicket } from '../controllers/tickets.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, prendreTicket);
router.get('/mes-tickets', requireAuth, mesTickets);
router.get('/all', requireAuth, requireRole('ADMIN'), tousLesTicketsAdmin);
router.delete('/historique', requireAuth, supprimerHistorique);
router.delete('/:id', requireAuth, supprimerTicket);
router.get('/file/:serviceId', fileAttente);
router.patch('/:id/valider', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), validerTicket);
router.patch('/:id/refuser', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), refuserTicket);
router.patch('/:id/appeler', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), appelTicket);
router.patch('/:id/terminer', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), terminerTicket);

export default router;
