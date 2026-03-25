import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Clear existing data
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.staffTimeOff.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      phone: '9070600540',
      password: hashedPassword,
      role: 'ADMIN',
      gender: 'OTHER',
    },
  });

  // 2. Create Sellers
  const seller1 = await prisma.user.create({
    data: {
      name: 'John Salon Owner',
      email: 'seller1@example.com',
      phone: '9070600540',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  const seller2 = await prisma.user.create({
    data: {
      name: 'Jane Beauty Expert',
      email: 'seller2@example.com',
      phone: '9070600540',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'FEMALE',
    },
  });

  // 3. Create Salons
  const salon1 = await prisma.salon.create({
    data: {
      name: 'Elite Hair Studio',
      address: '123 Luxury Ave, Beverly Hills, CA',
      ownerId: seller1.id,
      openTime: '09:00',
      closeTime: '20:00',
      lat: 34.0736,
      lng: -118.4004,
      categories: JSON.stringify({ primary: 'hair', related: ['styling', 'color'] }),
      images: JSON.stringify(['https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800']),
    },
  });

  const salon2 = await prisma.salon.create({
    data: {
      name: 'Serenity Spa & Wellness',
      address: '456 Calm St, Santa Monica, CA',
      ownerId: seller2.id,
      openTime: '10:00',
      closeTime: '22:00',
      lat: 34.0195,
      lng: -118.4912,
      categories: JSON.stringify({ primary: 'spa', related: ['massage', 'facial'] }),
      images: JSON.stringify(['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800']),
    },
  });

  // 4. Create Services
  const serviceData1 = [
    {
      name: 'Haircut',
      variants: [
        { targetGender: 'MALE' as const, price: 40, duration: 30 },
        { targetGender: 'FEMALE' as const, price: 65, duration: 60 },
        { targetGender: 'UNISEX' as const, price: 50, duration: 45 },
      ],
    },
    {
      name: 'Hair Coloring',
      variants: [{ targetGender: 'UNISEX' as const, price: 120, duration: 120 }],
    },
    {
      name: 'Beard Trim',
      variants: [{ targetGender: 'MALE' as const, price: 25, duration: 20 }],
    },
  ];

  const services1 = [];
  for (const s of serviceData1) {
    const service = await prisma.service.create({
      data: {
        name: s.name,
        salonId: salon1.id,
        variants: { create: s.variants },
      },
      include: { variants: true },
    });
    services1.push(service);
  }

  const serviceData2 = [
    {
      name: 'Full Body Massage',
      variants: [{ targetGender: 'UNISEX' as const, price: 100, duration: 60 }],
    },
    {
      name: 'Deep Tissue Massage',
      variants: [{ targetGender: 'UNISEX' as const, price: 130, duration: 90 }],
    },
    {
      name: 'Hydra Facial',
      variants: [{ targetGender: 'UNISEX' as const, price: 150, duration: 45 }],
    },
    {
      name: 'Manicure & Pedicure',
      variants: [{ targetGender: 'UNISEX' as const, price: 80, duration: 75 }],
    },
  ];

  const services2 = [];
  for (const s of serviceData2) {
    const service = await prisma.service.create({
      data: {
        name: s.name,
        salonId: salon2.id,
        variants: { create: s.variants },
      },
      include: { variants: true },
    });
    services2.push(service);
  }

  // 5. Create Staff
  const staff1 = await prisma.staff.create({
    data: {
      name: 'Michael Scott',
      salonId: salon1.id,
      skills: 'Master Stylist, Color Expert',
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      name: 'Pam Beesly',
      salonId: salon1.id,
      skills: 'Stylist, Reception',
    },
  });

  const staff3 = await prisma.staff.create({
    data: {
      name: 'Angela Martin',
      salonId: salon2.id,
      skills: 'Massage Therapist, Skin Care',
    },
  });

  // Link Staff to Services
  for (const s of services1) {
    await prisma.staffService.create({
      data: { staffId: staff1.id, serviceId: s.id },
    });
    await prisma.staffService.create({
      data: { staffId: staff2.id, serviceId: s.id },
    });
  }

  for (const s of services2) {
    await prisma.staffService.create({
      data: { staffId: staff3.id, serviceId: s.id },
    });
  }

  // Add Availability (Mon-Fri, 9-5)
  const staffMembers = [staff1, staff2, staff3];
  for (const staff of staffMembers) {
    for (let day = 1; day <= 5; day++) {
      await prisma.staffAvailability.create({
        data: {
          staffId: staff.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      });
    }
  }

  // 6. Create Customers
  const customer1 = await prisma.user.create({
    data: {
      name: 'Alice Cooper',
      email: 'customer1@example.com',
      phone: '9070600540',
      password: hashedPassword,
      role: 'CUSTOMER',
      gender: 'FEMALE',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Bob Marley',
      email: 'customer2@example.com',
      phone: '9070600540',
      password: hashedPassword,
      role: 'CUSTOMER',
      gender: 'MALE',
    },
  });

  // 7. Create Reviews
  await prisma.review.create({
    data: {
      userId: customer1.id,
      salonId: salon1.id,
      rating: 5,
      comment: 'Amazing service! Michael is the best.',
    },
  });

  await prisma.review.create({
    data: {
      userId: customer2.id,
      salonId: salon2.id,
      rating: 4,
      comment: 'Very relaxing atmosphere. Highly recommended.',
    },
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
