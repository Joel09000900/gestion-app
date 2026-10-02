import { PrismaClient } from '@prisma/client';
import { diffuser, diffuserPurge } from '../socket.js';

const prisma = new PrismaClient();

// RG-03 — cycle de vie d'un ticket :
//   EN_ATTENTE_VALIDATION → ATTENTE → APPELE → TRAITE | ABSENT
// La table est indexée par action et non par état d'arrivée, car ABSENT a deux
// origines légitimes qu'il faut distinguer : le refus avant validation et
// l'absence après appel (le journal Action les sépare, types REFUSE et
// ACTION_ABSENT). Toute transition absente de cette table est rejetée en 400.
const TRANSITIONS = {
  valider: { depuis: ['EN_ATTENTE_VALIDATION'], vers: 'ATTENTE' },
  refuser: { depuis: ['EN_ATTENTE_VALIDATION'], vers: 'ABSENT' },
  appeler: { depuis: ['ATTENTE'], vers: 'APPELE' },
  terminer: { depuis: ['APPELE'] }, // état d'arrivée fourni par la requête : TRAITE | ABSENT
};

// Contrôle unique en tête des quatre transitions : droit d'agir sur le ticket,
// puis légalité de la transition depuis son état courant. Renvoie le ticket si
// tout est bon ; sinon répond elle-même (404 ou 400) et renvoie null.
//
// L'ADMIN n'est pas restreint à une entreprise ; tout autre compte ne voit que
// les tickets de la sienne. Le statut est remonté au passage — la requête lit
// le ticket de toute façon.
async function verifierTransition(res, ticketId, user, action, cible) {
  const where = user.role === 'ADMIN'
    ? { id: ticketId }
    : { id: ticketId, service: { entreprise: { userId: user.id } } };
  const actuel = await prisma.ticket.findFirst({ where, select: { id: true, statut: true } });

  if (!actuel) {
    res.status(404).json({ message: 'Ticket introuvable' });
    return null;
  }

  const { depuis, vers } = TRANSITIONS[action];
  if (!depuis.includes(actuel.statut)) {
    res.status(400).json({
      message: `Transition impossible : un ticket ${actuel.statut} ne peut pas passer à ${cible ?? vers}.`,
    });
    return null;
  }

  return actuel;
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

    // Nombre de personnes devant : la file effective seulement. Les tickets
    // encore EN_ATTENTE_VALIDATION en sont exclus — une partie sera refusée,
    // les compter surestimerait la position annoncée au client.
    const devant = await prisma.ticket.count({
      where: { serviceId, statut: { in: ['ATTENTE', 'APPELE'] } },
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

    diffuser('ticket:nouveau', ticket);
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
        service: { select: { nom: true, entreprise: { select: { nom: true, type: true } } } },
        user: { select: { nom: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

// Statuts terminaux : le ticket a fini son cycle, il n'est plus qu'une ligne
// d'historique. Les purges s'y limitent quand un ticket vivant (ATTENTE,
// APPELE, EN_ATTENTE_VALIDATION) appartient encore au parcours d'un client.
const STATUTS_HISTORIQUE = ['TRAITE', 'ABSENT'];

export async function supprimerHistorique(req, res) {
  try {
    const { count } = await prisma.ticket.deleteMany({
      where: { userId: req.user.id, statut: { in: STATUTS_HISTORIQUE } },
    });
    res.json({ message: 'Historique supprimé', count });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

// Admin : remise à zéro de toute la plateforme — tous les tickets, tous
// statuts confondus, et le journal Action qui part en cascade. Les compteurs de
// service repartent de 0 pour que la numérotation recommence à A1, B1, C1…
// Équivalent en ligne du script purge-tickets.js.
export async function purgerToutAdmin(req, res) {
  try {
    const [actions, tickets, compteurs] = await prisma.$transaction([
      prisma.action.deleteMany({}),
      prisma.ticket.deleteMany({}),
      prisma.service.updateMany({ data: { compteur: 0 } }),
    ]);

    // Les tableaux de bord ouverts (client, entreprise, admin) rechargent sur
    // cet événement : sans lui, ils continueraient d'afficher des tickets morts.
    diffuserPurge({ portee: 'plateforme', tickets: tickets.count });

    res.json({
      message: 'Plateforme remise à zéro',
      tickets: tickets.count,
      actions: actions.count,
      compteursRemisAZero: compteurs.count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

// Entreprise : efface l'historique de ses propres services (tickets traités et
// absents). Les tickets encore en cours sont épargnés — un client ne doit pas
// voir disparaître le ticket sur lequel il attend. L'ADMIN passe ici aussi
// quand il consulte le tableau de bord entreprise ; faute d'entreprise
// rattachée à son compte, il reçoit un 404 explicite et utilise sa purge
// globale.
export async function purgerHistoriqueEntreprise(req, res) {
  try {
    const entreprise = await prisma.entreprise.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!entreprise) {
      return res.status(404).json({ message: 'Aucune entreprise rattachée à ce compte' });
    }

    const { count } = await prisma.ticket.deleteMany({
      where: {
        service: { entrepriseId: entreprise.id },
        statut: { in: STATUTS_HISTORIQUE },
      },
    });

    diffuserPurge({ portee: 'entreprise', entrepriseId: entreprise.id, tickets: count });

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
    if (!(await verifierTransition(res, id, req.user, 'appeler'))) return;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'APPELE',
        guichet,
        actions: { create: { type: 'ACTION_APPELE', guichet } },
      },
    });
    diffuser('ticket:appele', ticket);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function validerTicket(req, res) {
  const { id } = req.params;

  try {
    if (!(await verifierTransition(res, id, req.user, 'valider'))) return;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'ATTENTE',
        actions: { create: { type: 'VALIDE' } },
      },
    });
    diffuser('ticket:valide', ticket);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function refuserTicket(req, res) {
  const { id } = req.params;

  try {
    // Le refus ne vaut qu'avant validation : un ticket déjà entré dans la file
    // se clôture par /terminer, pas par un refus.
    if (!(await verifierTransition(res, id, req.user, 'refuser'))) return;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut: 'ABSENT',
        actions: { create: { type: 'REFUSE' } },
      },
    });
    diffuser('ticket:refuse', ticket);
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
    // Clôture : seul un ticket appelé peut être traité ou déclaré absent.
    if (!(await verifierTransition(res, id, req.user, 'terminer', statut))) return;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        statut,
        actions: { create: { type: statut === 'TRAITE' ? 'ACTION_TRAITE' : 'ACTION_ABSENT' } },
      },
    });
    diffuser(statut === 'TRAITE' ? 'ticket:traite' : 'ticket:absent', ticket);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}
