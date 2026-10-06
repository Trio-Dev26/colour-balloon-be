import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  await prisma.role.upsert({
    where: { name: 'teacher' },
    update: {},
    create: { name: 'teacher' },
  });
  await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: { name: 'student' },
  });

  const email = process.env.ADMIN_EMAIL!;
  const username = process.env.ADMIN_USERNAME!;
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      username,
      fullname: 'Admin',
      email,
      password,
      roleId: adminRole.id,
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
