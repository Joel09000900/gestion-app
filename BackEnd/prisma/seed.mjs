/**
 * Seed — peuple les tables Service (et crée des tickets de démo)
 * Lancer : node prisma/seed.mjs
 *
 * Attribution :
 *   joj   (henocjoelsay@gmail.com)  → services Coiffure
 *   jojo8 (Henocsayp@gmail.com)     → services Tresseuses
 *   henoc (henocsay0@gmail.com)     → services Pressing
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── 1. Récupération des entreprises ──────────────────────────────────────────

const [joj, jojo8, henoc] = await Promise.all([
  prisma.entreprise.findFirst({ where: { user: { email: 'henocjoelsay@gmail.com' } } }),
  prisma.entreprise.findFirst({ where: { user: { email: 'Henocsayp@gmail.com' } } }),
  prisma.entreprise.findFirst({ where: { user: { email: 'henocsay0@gmail.com' } } }),
]);

console.log('Entreprises trouvées :');
console.log(' - joj    :', joj  ? joj.id  : '❌ introuvable');
console.log(' - jojo8  :', jojo8 ? jojo8.id : '❌ introuvable');
console.log(' - henoc  :', henoc ? henoc.id : '❌ introuvable');

// ── 2. Services Coiffure (joj) ────────────────────────────────────────────────

if (joj) {
  await prisma.service.createMany({
    data: [
      { nom: 'Coupe homme',  prefixe: 'A', icone: '✂️', description: 'Coupe classique, dégradé, barbe',   entrepriseId: joj.id },
      { nom: 'Coupe enfant', prefixe: 'B', icone: '🧒', description: 'Coupe adaptée aux plus petits',     entrepriseId: joj.id },
      { nom: 'Coloration',   prefixe: 'C', icone: '🎨', description: 'Couleur, mèches, balayage',          entrepriseId: joj.id },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Services Coiffure créés pour joj');
}

// ── 3. Services Tresseuses (jojo8) ────────────────────────────────────────────

if (jojo8) {
  await prisma.service.createMany({
    data: [
      { nom: 'Défrissage',   prefixe: 'A', icone: '💆', description: 'Lissage et défrisage professionnel',     entrepriseId: jojo8.id },
      { nom: 'Tresses',      prefixe: 'B', icone: '👑', description: 'Box braids, cornrows, twists sur mesure', entrepriseId: jojo8.id },
      { nom: 'Tissage',      prefixe: 'C', icone: '🧵', description: 'Pose de tissage cousu ou clipsé',         entrepriseId: jojo8.id },
      { nom: 'Mèche longue', prefixe: 'D', icone: '📏', description: 'Rajout de mèches longues, effet volume',  entrepriseId: jojo8.id },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Services Tresseuses créés pour jojo8');
}

// ── 4. Services Pressing (henoc) ──────────────────────────────────────────────

if (henoc) {
  await prisma.service.createMany({
    data: [
      { nom: 'Lavage express', prefixe: 'A', icone: '🫧', description: 'Lavage rapide en 30 minutes',                  entrepriseId: henoc.id },
      { nom: 'Lavage normal',  prefixe: 'B', icone: '👕', description: 'Lavage complet et soigneux',                    entrepriseId: henoc.id },
      { nom: 'Repassage',      prefixe: 'C', icone: '🌀', description: 'Repassage professionnel à la vapeur',           entrepriseId: henoc.id },
      { nom: 'Nettoyage sec',  prefixe: 'D', icone: '🧴', description: 'Nettoyage délicat pour vêtements fragiles',    entrepriseId: henoc.id },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Services Pressing créés pour henoc');
}

// ── 5. Résumé final ───────────────────────────────────────────────────────────

const total = await prisma.service.count();
console.log(`\n📦 Total services en base : ${total}`);

const services = await prisma.service.findMany({
  include: { entreprise: { select: { nom: true } } },
});
console.table(services.map(s => ({ nom: s.nom, prefixe: s.prefixe, entreprise: s.entreprise.nom, id: s.id })));

await prisma.$disconnect();
