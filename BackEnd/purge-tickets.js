// Utilitaire admin — remet la file d'attente à zéro sur toute la plateforme.
//
// Supprime TOUS les tickets (et, par cascade sur Ticket → Action, tout
// l'historique des transactions), puis remet chaque Service.compteur à 0 pour
// que la numérotation des tickets reparte de A1, B1, C1…
//
// Usage :
//   node purge-tickets.js            → compte ce qui serait supprimé, ne touche à rien
//   node purge-tickets.js --confirm  → exécute la purge
//
// Les comptes, entreprises et services ne sont PAS touchés : seuls les tickets
// et leurs actions disparaissent. Cible la BD définie par DATABASE_URL.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const confirme = process.argv.includes('--confirm');

async function run() {
  const [tickets, actions, services] = await Promise.all([
    prisma.ticket.count(),
    prisma.action.count(),
    prisma.service.count(),
  ]);

  const parStatut = await prisma.ticket.groupBy({
    by: ['statut'],
    _count: { _all: true },
  });

  console.log('État actuel de la base :');
  console.log(`  tickets  : ${tickets}`);
  console.log(`  actions  : ${actions}`);
  console.log(`  services : ${services} (compteurs à remettre à 0)`);
  for (const s of parStatut) {
    console.log(`    - ${s.statut.padEnd(24)} ${s._count._all}`);
  }

  if (!confirme) {
    console.log('\nℹ️  Simulation seule — rien supprimé. Relance avec --confirm pour exécuter.');
    return;
  }

  // Les Action partent en cascade avec leur Ticket (onDelete: Cascade),
  // on les supprime quand même explicitement pour ne rien laisser d'orphelin.
  const [actionsSupprimees, ticketsSupprimes, compteursRemis] = await prisma.$transaction([
    prisma.action.deleteMany({}),
    prisma.ticket.deleteMany({}),
    prisma.service.updateMany({ data: { compteur: 0 } }),
  ]);

  console.log('\n✔ Purge effectuée :');
  console.log(`  ${ticketsSupprimes.count} ticket(s) supprimé(s)`);
  console.log(`  ${actionsSupprimees.count} action(s) supprimée(s)`);
  console.log(`  ${compteursRemis.count} compteur(s) de service remis à 0`);

  const restants = await prisma.ticket.count();
  console.log(`\nVérification : ${restants} ticket(s) en base.`);
}

run()
  .catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
