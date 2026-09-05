// Amorce les deux catégories réservées à l'administrateur (residence,
// agence-waves), restées sans aucune entreprise et donc sans contenu à l'écran.
//
// Crée, pour chaque type : un compte ENTREPRISE + son entreprise + son
// catalogue de services (repris de servicesCatalog.js, comme le fait
// l'inscription normale).
//
// Idempotent : un compte déjà présent est laissé tel quel.
// Réversible : les identifiants créés sont affichés en fin d'exécution.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { SERVICES_BY_TYPE } from './src/data/servicesCatalog.js';

const prisma = new PrismaClient();

const A_CREER = [
  { type: 'residence',    nom: 'Ivoire Habitat',   email: 'contact@ivoire-habitat.ci',  description: "Agence immobilière — location et vente de logements" },
  { type: 'agence-waves', nom: 'Agence Wave Cocody', email: 'contact@agence-wave-cocody.ci', description: "Agence de monnaie électronique — dépôt, retrait et paiements" },
];

const motDePasse = process.argv[2];
if (!motDePasse) {
  console.error('Usage : node seed-categories-admin.js <motDePasseDesComptesCrees>');
  process.exit(1);
}

const resume = [];

for (const cible of A_CREER) {
  const existant = await prisma.entreprise.findFirst({ where: { type: cible.type } });
  if (existant) {
    console.log(`= ${cible.type.padEnd(14)} deja peuplee (${existant.nom}) — rien fait`);
    continue;
  }

  const dejaUser = await prisma.user.findUnique({ where: { email: cible.email } });
  if (dejaUser) {
    console.log(`! ${cible.type.padEnd(14)} le compte ${cible.email} existe deja sans entreprise — a traiter a la main`);
    continue;
  }

  const hash = await bcrypt.hash(motDePasse, 10);
  const user = await prisma.user.create({
    data: { nom: cible.nom, email: cible.email, password: hash, role: 'ENTREPRISE' },
    select: { id: true, email: true },
  });

  const entreprise = await prisma.entreprise.create({
    data: {
      nom: cible.nom,
      type: cible.type,
      description: cible.description,
      userId: user.id,
      services: { create: SERVICES_BY_TYPE[cible.type] },
    },
    include: { services: { select: { nom: true, prefixe: true } } },
  });

  console.log(`+ ${cible.type.padEnd(14)} ${entreprise.nom} cree avec ${entreprise.services.length} services`);
  resume.push({ type: cible.type, nom: entreprise.nom, email: user.email, userId: user.id, entrepriseId: entreprise.id });
}

if (resume.length) {
  console.log('\n=== COMPTES CREES (pour suppression eventuelle) ===');
  for (const r of resume) {
    console.log(`  ${r.nom}`);
    console.log(`    email        ${r.email}`);
    console.log(`    userId       ${r.userId}`);
    console.log(`    entrepriseId ${r.entrepriseId}`);
  }
}

console.log('\n=== ETAT FINAL PAR TYPE ===');
const toutes = await prisma.entreprise.findMany({ select: { nom: true, type: true } });
const parType = {};
for (const e of toutes) (parType[e.type ?? '(sans)'] ??= []).push(e.nom);
for (const [t, l] of Object.entries(parType).sort()) {
  console.log(`  ${t.padEnd(14)} ${l.length} : ${l.join(', ')}`);
}

await prisma.$disconnect();
