import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { SERVICE_TYPES, SERVICES_BY_TYPE } from '../data/servicesCatalog.js';

const prisma = new PrismaClient();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function inscription(req, res) {
  const { nom, email, password, role, type } = req.body;
  if (!nom || !email || !password || !role) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  const isEntreprise = role.toUpperCase() === 'ENTREPRISE';
  if (isEntreprise && !SERVICE_TYPES.includes(type)) {
    return res.status(400).json({ message: 'Type de service invalide ou manquant' });
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nom, email, password: hash, role: role.toUpperCase() },
      select: { id: true, nom: true, email: true, role: true },
    });

    if (isEntreprise) {
      // Entreprise + ses services (du type choisi) créés d'emblée :
      // un client pourra choisir cette entreprise et voir ses services dès maintenant.
      await prisma.entreprise.create({
        data: {
          nom,
          type,
          userId: user.id,
          services: { create: SERVICES_BY_TYPE[type] },
        },
      });
    }

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function connexion(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nom: true, email: true, role: true, avatar: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

export async function updateAvatar(req, res) {
  const { avatar } = req.body;
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { avatar } });
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}
