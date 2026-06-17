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
    });
    if (!entreprise) return res.status(404).json({ message: 'Entreprise introuvable' });

    const [total, traites, absents, enAttente] = await Promise.all([
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id } } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: 'TRAITE' } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: 'ABSENT' } }),
      prisma.ticket.count({ where: { service: { entrepriseId: entreprise.id }, statut: { in: ['ATTENTE', 'APPELE'] } } }),
    ]);

    res.json({ total, traites, absents, enAttente });
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
