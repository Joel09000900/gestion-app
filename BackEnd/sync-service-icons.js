// Utilitaire admin — resynchronise le champ `icone` des services déjà en base
// avec les valeurs actuelles de data/servicesCatalog.js.
//
// Nécessaire car les services sont copiés en base une seule fois, à la création
// du compte entreprise (voir auth.controller.js) : modifier servicesCatalog.js
// ne met à jour que les nouveaux comptes, pas les services déjà existants.
//
// Usage : node sync-service-icons.js
// Cible la BD définie par DATABASE_URL dans .env.

import { PrismaClient } from '@prisma/client';
import { SERVICES_BY_TYPE } from './src/data/servicesCatalog.js';

const prisma = new PrismaClient();

async function run() {
  const catalogue = Object.values(SERVICES_BY_TYPE).flat();
  let total = 0;

  for (const { nom, icone } of catalogue) {
    const { count } = await prisma.service.updateMany({
      where: { nom, icone: { not: icone } },
      data: { icone },
    });
    if (count > 0) console.log(`✔ ${nom} → ${icone} (${count} service(s) mis à jour)`);
    total += count;
  }

  console.log(total > 0 ? `\n📦 ${total} service(s) resynchronisé(s).` : '\nRien à mettre à jour, déjà à jour.');
}

run()
  .catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
