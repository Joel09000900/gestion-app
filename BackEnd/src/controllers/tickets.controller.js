import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Vérifie qu'un ticket relève bien de l'entreprise de l'utilisateur connecté.
// L'ADMIN a tous les droits (bypass). Renvoie true si l'action est autorisée.
async function peutAgirSurTicket(ticketId, user) {
  if (user.role === 'ADMIN') return true;
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, service: { entreprise: { userId: user.id } } },
    select: { id: true },
  });
  return Boolean(ticket);
}

export async function prendreTicket(req, res) {
  const { serviceId } = req.body;
  const userId = req.user.id;

  if (!serviceId) return res.status(400).json({ message: 'serviceId requis' });

  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: 'Service introuvable' });

    // Incrément atomique du compteur de service → numéro unique et monotone
    // (jamais réutilisé même si un ticket est supprimé ou traité)
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: { compteur: { increment: 1 } },
    });
    const numero = `${service.prefixe}-${updatedService.compteur}`;

    // Nombre de personnes devant (tickets actifs)
    const devant = await prisma.ticket.count({
      where: { serviceId, statut: { in: ['EN_ATTENTE_VALIDATION', 'ATTENTE', 'APPELE'] } },
    });

    const ticket = await prisma.ticket.create({
      data: {
        numero,
        serviceId,
        userId,
        statut: 'EN_ATTENTE_VALIDATION',
        devant,
        attente: devant * 7, // estimation : ~7 min par personne devant
        actions: { create: { type: 'EMIS' } },
      },
      include: { service: true, actions: true },
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function mesTickets(req, res) {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.id },
      include: { service: { include: { entreprise: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

// Admin : tous les tickets, toutes entreprises confondues (pour le tableau de bord global).
export async function tousLesTicketsAdmin(req, res) {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        service: { select: { nom: true, icone: true, entreprise: { select: { nom: true, type: true } } } },
        user: { select: { nom: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function supprimerHistorique(req, res) {
  try {
    const { count } = await prisma.ticket.deleteMany({
      where: { userId: req.user.id, statut: { in: ['TRAITE', 'ABSENT'] } },
    });
    res.json({ message: 'Historique supprimé', count });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function supprimerTicket(req, res) {
  const { id } = req.params;
  try {
    // deleteMany filtré par userId : ne supprime que si le ticket appartient au client
    const { count } = await prisma.ticket.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (count === 0) return res.status(404).json({ message: 'Ticket introuvable' });
    res.json({ message: 'Ticket supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function fileAttente(req, res) {
  const { serviceId } = req.params;
  try {
    const tickets = await prisma.ticket.findMany({
      where: { serviceId, statut: { in: ['ATTENTE', 'APPELE'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, numero: true, statut: true, guichet: true, createdAt: true },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function appelTicket(req, res) {
  const { id } = req.params;
  const { guichet } = req.body;

  try {
    if (!(await peutAgirSurTicket(id, req.user))) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'APPELE',
        guichet,
        actions: { create: { type: 'ACTION_APPELE', guichet } },
      },
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function validerTicket(req, res) {
  const { id } = req.params;

  try {
    if (!(await peutAgirSurTicket(id, req.user))) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'ATTENTE',
        actions: { create: { type: 'VALIDE' } },
      },
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function refuserTicket(req, res) {
  const { id } = req.params;

  try {
    if (!(await peutAgirSurTicket(id, req.user))) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'ABSENT',
        actions: { create: { type: 'REFUSE' } },
      },
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function terminerTicket(req, res) {
  const { id } = req.params;
  const { statut } = req.body; // TRAITE | ABSENT

  if (!['TRAITE', 'ABSENT'].includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }

  try {
    if (!(await peutAgirSurTicket(id, req.user))) {
      return res.status(404).json({ message: 'Ticket introuvable' });
    }
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut,
        actions: { create: { type: statut === 'TRAITE' ? 'ACTION_TRAITE' : 'ACTION_ABSENT' } },
      },
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}
