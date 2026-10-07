// Usage :  npm run create-admin -- admin@exemple.sn "MotDePasseSolide123"
// Un ADMIN ne peut être créé que par ce script (jamais via l'API d'inscription).
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 10) {
    console.error('Usage : npm run create-admin -- <email> <mot de passe (10 caractères min)>');
    process.exit(1);
  }
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: 'ADMIN', passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
    create: { email: email.toLowerCase(), passwordHash: await hashPassword(password), role: 'ADMIN', emailVerifiedAt: new Date() },
  });
  console.log(`✔ Admin prêt : ${user.email} (id ${user.id})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
