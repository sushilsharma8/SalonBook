import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@salonbook.com' } });
  console.log('User:', user?.email);
  if (user) {
    const valid = await bcrypt.compare('admin123', user.password);
    console.log('Password valid:', valid);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
