import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@jeloft.com' } });

  if (existing) {
    console.log('Compte admin déjà existant :', existing.email);
    return;
  }

  const hash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.create({
    data: {
      nom: 'Administrateur',
      email: 'admin@jeloft.com',
      password: hash,
      role: 'ADMIN',
    },
  });

  console.log('Compte admin créé avec succès !');
  console.log('Email    :', admin.email);
  console.log('Password : admin1234');
  console.log('⚠️  Change ce mot de passe après la première connexion.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
