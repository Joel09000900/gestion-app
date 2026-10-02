// Utilitaire admin — vide le champ `icone` des services déjà en base.
//
// Les pictogrammes emoji ont été retirés de l'interface : identité visuelle
// sobre, attendue d'un outil professionnel. Le catalogue
// (data/servicesCatalog.js) n'en porte donc plus, et la colonne `icone` a pour
// défaut la chaîne vide.
//
// Ce script traite les services créés AVANT ce changement : ils sont copiés en
// base une seule fois, à la création du compte entreprise (voir
// auth.controller.js), donc modifier le catalogue ne touche que les nouveaux
// comptes.
//
// La colonne est conservée (vide) plutôt que supprimée : aucune migration
// destructive, et le jour où des pictogrammes vectoriels seraient réintroduits
// le champ est déjà là.
//
// Usage : node sync-service-icons.js
// Cible la BD définie par DATABASE_URL dans .env. Idempotent.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const aVider = await prisma.service.count({ where: { NOT: { icone: '' } } });

  if (aVider === 0) {
    console.log('Aucune icône en base — rien à faire.');
    return;
  }

  const { count } = await prisma.service.updateMany({
    where: { NOT: { icone: '' } },
    data: { icone: '' },
  });

  console.log(`✔ ${count} service(s) dont l'icône a été vidée.`);

  const reste = await prisma.service.count({ where: { NOT: { icone: '' } } });
  console.log(`Vérification : ${reste} service(s) portent encore une icône.`);
}

run()
  .catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
