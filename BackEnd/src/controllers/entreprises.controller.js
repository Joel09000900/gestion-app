import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Public : liste les entreprises (optionnellement filtrées par type) avec leurs
// services et le nombre de personnes en file. Sert au client pour choisir une entreprise.
export async function listerEntreprisesParType(req, res) {
  const { type } = req.query;
  try {
    const entreprises = await prisma.entreprise.findMany({
      where: type ? { type } : {},
      select: {
        id: true, nom: true, description: true, type: true, avatar: true, lat: true, lng: true,
        services: {
          select: {
            id: true, nom: true, prefixe: true, icone: true, description: true,
            _count: { select: { tickets: { where: { statut: { in: ['ATTENTE', 'APPELE'] } } } } },
          },
          orderBy: { prefixe: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    });
    res.json(entreprises);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function monEntreprise(req, res) {
  try {
    const entreprise = await prisma.entreprise.findUnique({
      where: { userId: req.user.id },
      include: {
        services: {
          include: {
            _count: { select: { tickets: { where: { statut: { in: ['ATTENTE', 'APPELE'] } } } } },
          },
        },
      },
    });
    if (!entreprise) return res.status(404).json({ message: 'Entreprise introuvable' });
    res.json(entreprise);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function statsEntreprise(req, res) {
  try {
    const entreprise = await prisma.entreprise.findUnique({
      where: { userId: req.user.id },
      include: { services: { select: { id: true, nom: true } } },
    });
    if (!entreprise) return res.status(404).json({ message: 'Entreprise introuvable' });

    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 jours de recul pour les répartitions

    const [total, traites, absents, enAttente, parServiceRaw, actions] = await Promise.all([
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id } } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: 'TRAITE' } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: 'ABSENT' } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: { in: ['ATTENTE', 'APPELE'] } } }),
      prisma.ticket.groupBy({
        by: ['serviceId'],
        where: { service: { entrepriseId: entreprise.id }, statut: { in: ['TRAITE', 'ABSENT'] } },
        _count: { _all: true },
      }),
      prisma.action.findMany({
        where: { ticket: { service: { entrepriseId: entreprise.id } }, createdAt: { gte: since } },
        select: { type: true, createdAt: true, ticketId: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const serviceNomById = new Map(entreprise.services.map((s) => [s.id, s.nom]));
    const parService = parServiceRaw
      .map((g) => ({ service: serviceNomById.get(g.serviceId) ?? 'Service', count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    // Regroupe les actions par ticket pour calculer attente (EMIS→appel) et durée de service (appel→traité).
    const parTicket = new Map();
    for (const a of actions) {
      if (!parTicket.has(a.ticketId)) parTicket.set(a.ticketId, {});
      parTicket.get(a.ticketId)[a.type] = a.createdAt;
    }

    const waitMinutes = [];
    const serviceMinutes = [];
    for (const t of parTicket.values()) {
      if (t.EMIS && t.ACTION_APPELE) waitMinutes.push((t.ACTION_APPELE - t.EMIS) / 60000);
      if (t.ACTION_APPELE && t.ACTION_TRAITE) serviceMinutes.push((t.ACTION_TRAITE - t.ACTION_APPELE) / 60000);
    }
    const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

    // Heures de pointe : répartition des créations de tickets (EMIS) par heure de la journée.
    const heuresPointe = Array.from({ length: 24 }, (_, heure) => ({ heure, count: 0 }));
    for (const a of actions) {
      if (a.type === 'EMIS') heuresPointe[a.createdAt.getHours()].count += 1;
    }

    // Traités/absents par jour, 14 derniers jours.
    const jours = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const parJourMap = new Map(jours.map((j) => [j, { date: j, traites: 0, absents: 0 }]));
    for (const a of actions) {
      const entry = parJourMap.get(a.createdAt.toISOString().slice(0, 10));
      if (!entry) continue;
      if (a.type === 'ACTION_TRAITE') entry.traites += 1;
      if (a.type === 'ACTION_ABSENT') entry.absents += 1;
    }

    res.json({
      total, traites, absents, enAttente,
      tauxAbsence: traites + absents > 0 ? absents / (traites + absents) : null,
      parService,
      parJour: [...parJourMap.values()],
      heuresPointe,
      attenteMoyenneMin: avg(waitMinutes),
      serviceMoyenMin: avg(serviceMinutes),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function tousLesTickets(req, res) {
  try {
    const entreprise = await prisma.entreprise.findUnique({
      where: { userId: req.user.id },
    });
    if (!entreprise) return res.status(404).json({ message: 'Entreprise introuvable' });

    const tickets = await prisma.ticket.findMany({
      where: { service: { entrepriseId: entreprise.id } },
      include: { service: true, user: { select: { id: true, nom: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function updateEntrepriseAvatar(req, res) {
  const { avatar } = req.body;
  try {
    await prisma.entreprise.update({ where: { userId: req.user.id }, data: { avatar } });
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function updateEntrepriseProfile(req, res) {
  const { nom, description, lat, lng } = req.body;
  try {
    const entreprise = await prisma.entreprise.update({
      where: { userId: req.user.id },
      data: {
        ...(nom && { nom }),
        ...(description !== undefined && { description }),
        ...(lat !== undefined && { lat: parseFloat(lat) }),
        ...(lng !== undefined && { lng: parseFloat(lng) }),
      },
    });
    res.json(entreprise);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}
