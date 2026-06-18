// Utilitaire admin — réinitialise le mot de passe d'un compte.
// Usage :
//   node reset-password.js <email>                  → vérifie que le compte existe (rien modifié)
//   node reset-password.js <email> <nouveauMotDePasse> → met à jour le mot de passe (hash bcrypt)
//
// Le mot de passe est passé en argument : il ne traîne pas en clair dans le code.
// Cible la BD définie par DATABASE_URL dans .env.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [, , email, password] = process.argv;

if (!email) {
  console.error('Usage: node reset-password.js <email> [nouveauMotDePasse]');
  process.exit(1);
}

async function run() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, nom: true, email: true, role: true },
  });

  if (!user) {
    console.log(`❌ Aucun compte avec l'email : ${email}`);
    return;
  }

  console.log(`✔ Compte trouvé : ${user.nom} (${user.role}) — ${user.email}`);

  if (!password) {
    console.log('ℹ️  Aucun mot de passe fourni → vérification seule, rien modifié.');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { password: hash } });
  console.log(`🔑 Mot de passe mis à jour pour ${email}.`);
}

run()
  .catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
