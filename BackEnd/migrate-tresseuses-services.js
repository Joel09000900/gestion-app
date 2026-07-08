// Utilitaire admin — migre les services Tresseuses déjà en base vers le nouveau
// catalogue (Défrissage / Tresses / Tissage / Mèche longue).
//
// Renomme en place les services existants (par préfixe, entreprise de type
// 'tresseuses') plutôt que de les supprimer, afin de préserver les tickets
// déjà émis. Crée le 4ᵉ service (Mèche longue, prefixe D) s'il n'existe pas.
//
// Usage : node migrate-tresseuses-services.js
// Cible la BD définie par DATABASE_URL dans .env.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RENAME = [
  { prefixe: 'A', nom: 'Défrissage', icone: '💆', description: 'Lissage et défrisage professionnel' },
  { prefixe: 'B', nom: 'Tresses',    icone: '👑', description: 'Box braids, cornrows, twists sur mesure' },
  { prefixe: 'C', nom: 'Tissage',    icone: '🧵', description: 'Pose de tissage cousu ou clipsé' },
];
const NOUVEAU = { prefixe: 'D', nom: 'Mèche longue', icone: '📏', description: 'Rajout de mèches longues, effet volume' };

async function run() {
  for (const { prefixe, nom, icone, description } of RENAME) {
    const { count } = await prisma.service.updateMany({
      where: { prefixe, entreprise: { type: 'tresseuses' } },
      data: { nom, icone, description },
    });
    console.log(`✔ Préfixe ${prefixe} → "${nom}" (${count} service(s) renommé(s))`);
  }

  const entreprises = await prisma.entreprise.findMany({ where: { type: 'tresseuses' } });
  for (const ent of entreprises) {
    const existe = await prisma.service.findUnique({
      where: { entrepriseId_prefixe: { entrepriseId: ent.id, prefixe: NOUVEAU.prefixe } },
    });
    if (!existe) {
      await prisma.service.create({ data: { ...NOUVEAU, entrepriseId: ent.id } });
      console.log(`✔ "${NOUVEAU.nom}" créé pour ${ent.nom}`);
    } else {
      console.log(`ℹ "${NOUVEAU.nom}" existe déjà pour ${ent.nom}`);
    }
  }
}

run()
  .catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
