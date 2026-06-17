import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function tousLesServices(req, res) {
  try {
    const services = await prisma.service.findMany({
      include: {
        entreprise: { select: { id: true, nom: true } },
        _count: { select: { tickets: { where: { statut: { in: ['ATTENTE', 'APPELE'] } } } } },
      },
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function listerServices(req, res) {
  const { entrepriseId } = req.params;
  try {
    const services = await prisma.service.findMany({
      where: { entrepriseId },
      include: {
        _count: { select: { tickets: { where: { statut: { in: ['ATTENTE', 'APPELE'] } } } } },
      },
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function creerService(req, res) {
  const { nom, prefixe, icone, description } = req.body;
  if (!nom || !prefixe) return res.status(400).json({ message: 'nom et prefixe requis' });

  try {
    const entreprise = await prisma.entreprise.findUnique({
      where: { userId: req.user.id },
    });
    if (!entreprise) return res.status(403).json({ message: 'Entreprise introuvable' });

    const service = await prisma.service.create({
      data: { nom, prefixe: prefixe.toUpperCase(), icone, description, entrepriseId: entreprise.id },
    });
    res.status(201).json(service);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Ce préfixe est déjà utilisé' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function supprimerService(req, res) {
  const { id } = req.params;
  try {
    // Propriété : seul l'ADMIN ou l'entreprise propriétaire peut supprimer le service.
    if (req.user.role !== 'ADMIN') {
      const service = await prisma.service.findFirst({
        where: { id, entreprise: { userId: req.user.id } },
        select: { id: true },
      });
      if (!service) return res.status(404).json({ message: 'Service introuvable' });
    }
    await prisma.service.delete({ where: { id } });
    res.json({ message: 'Service supprimé' });
  } catch (err) {
    // FK : un service ayant des tickets ne peut être supprimé sans casser l'historique.
    if (err.code === 'P2003') {
      return res.status(409).json({ message: 'Service utilisé par des tickets, suppression impossible' });
    }
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}
