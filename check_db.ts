import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const staff = await prisma.staff.findMany({ include: { services: true, availability: true } });
  console.log(JSON.stringify(staff, null, 2));
}
main();
