import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    include: { variants: true },
  });

  for (const service of services) {
    if (service.variants.length > 0) continue;

    // Legacy services are migrated to one UNISEX variant.
    await prisma.serviceVariant.create({
      data: {
        serviceId: service.id,
        targetGender: 'UNISEX',
        price: service.price ?? 0,
        duration: service.duration ?? 30,
      },
    });
  }

  console.log(`Backfill complete for ${services.length} services`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
