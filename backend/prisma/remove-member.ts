/**
 * Retire une personne de l'équipe de son organisation (sans effacer son compte ni ce qu'elle a écrit).
 * Usage : npx ts-node --transpile-only prisma/remove-member.ts awa.kone@horizon-inclusif.example
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Indiquez l’adresse e-mail : npx ts-node --transpile-only prisma/remove-member.ts prenom.nom@exemple');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.log(`Aucun compte pour ${email} : rien à faire.`); return; }
  const gone = await prisma.organizationMember.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { status: 'DISABLED' } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  console.log(`✔ ${user.firstName} ${user.lastName} retiré(e) de l’équipe (${gone.count} rattachement supprimé) et compte désactivé.`);
}
main().catch((e) => { console.error('✖ Échec :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
