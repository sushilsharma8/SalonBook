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
      images: JSON.stringify(['https://picsum.photos/seed/salon-elite/800/400']),
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
      images: JSON.stringify(['https://picsum.photos/seed/salon-serenity/800/400']),
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

  // --- DELHI SALONS ---

  const seller3 = await prisma.user.create({
    data: {
      name: 'Ravi Sharma',
      email: 'seller3@example.com',
      phone: '9811234567',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  const seller4 = await prisma.user.create({
    data: {
      name: 'Priya Kapoor',
      email: 'seller4@example.com',
      phone: '9812345678',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'FEMALE',
    },
  });

  const seller5 = await prisma.user.create({
    data: {
      name: 'Amit Verma',
      email: 'seller5@example.com',
      phone: '9813456789',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  const seller6 = await prisma.user.create({
    data: {
      name: 'Neha Gupta',
      email: 'seller6@example.com',
      phone: '9814567890',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'FEMALE',
    },
  });

  const seller7 = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'seller7@example.com',
      phone: '9815678901',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  // --- MOHALI SALONS ---

  const seller8 = await prisma.user.create({
    data: {
      name: 'Aasif Khan',
      email: 'seller8@example.com',
      phone: '9876543210',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  const seller9 = await prisma.user.create({
    data: {
      name: 'Simran Kaur',
      email: 'seller9@example.com',
      phone: '9877654321',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'FEMALE',
    },
  });

  const seller10 = await prisma.user.create({
    data: {
      name: 'Harpreet Sandhu',
      email: 'seller10@example.com',
      phone: '9878765432',
      password: hashedPassword,
      role: 'SELLER',
      gender: 'MALE',
    },
  });

  // Delhi Salon 1: Glanz Studio (Lajpat Nagar)
  const salonDelhi1 = await prisma.salon.create({
    data: {
      name: 'Glanz Studio Unisex Salon',
      address: 'Central Market, Lajpat Nagar 2, New Delhi, Delhi 110024',
      ownerId: seller3.id,
      openTime: '10:00',
      closeTime: '21:00',
      lat: 28.5700,
      lng: 77.2400,
      categories: JSON.stringify({ primary: 'hair', related: ['beauty', 'nails'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-glanz/800/400']),
    },
  });

  // Delhi Salon 2: Pureté (Malviya Nagar)
  const salonDelhi2 = await prisma.salon.create({
    data: {
      name: 'Pureté Unisex Salon',
      address: 'Malviya Nagar Corner Market, Main Road, Malviya Nagar, New Delhi, Delhi 110017',
      ownerId: seller4.id,
      openTime: '10:00',
      closeTime: '21:30',
      lat: 28.5440,
      lng: 77.2100,
      categories: JSON.stringify({ primary: 'beauty', related: ['hair', 'spa'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-purete/800/400']),
    },
  });

  // Delhi Salon 3: Hair Masters (Dwarka)
  const salonDelhi3 = await prisma.salon.create({
    data: {
      name: 'Hair Masters Luxury Salon',
      address: 'Vegas Mall, Sector 12, Dwarka, New Delhi, Delhi 110075',
      ownerId: seller5.id,
      openTime: '10:00',
      closeTime: '21:00',
      lat: 28.5921,
      lng: 77.0410,
      categories: JSON.stringify({ primary: 'hair', related: ['barber', 'beauty'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-hairmasters/800/400']),
    },
  });

  // Delhi Salon 4: Cut & Style (Rajouri Garden)
  const salonDelhi4 = await prisma.salon.create({
    data: {
      name: 'Cut & Style Premium Salon',
      address: 'J-Block Market, Rajouri Garden, New Delhi, Delhi 110027',
      ownerId: seller6.id,
      openTime: '09:30',
      closeTime: '20:30',
      lat: 28.6492,
      lng: 77.1215,
      categories: JSON.stringify({ primary: 'hair', related: ['nails', 'waxing'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-cutstyle/800/400']),
    },
  });

  // Delhi Salon 5: Looks Unisex (Connaught Place)
  const salonDelhi5 = await prisma.salon.create({
    data: {
      name: 'Looks Unisex Salon',
      address: 'N-Block, Connaught Place, New Delhi, Delhi 110001',
      ownerId: seller7.id,
      openTime: '10:00',
      closeTime: '21:00',
      lat: 28.6315,
      lng: 77.2167,
      categories: JSON.stringify({ primary: 'beauty', related: ['hair', 'medspa'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-looks/800/400']),
    },
  });

  // Mohali Salon 1: HairSpace (Phase 3B2)
  const salonMohali1 = await prisma.salon.create({
    data: {
      name: 'HairSpace Salon',
      address: 'SCO 59-60, First Floor, Phase 3B2, Mohali, Punjab 160059',
      ownerId: seller8.id,
      openTime: '10:00',
      closeTime: '21:00',
      lat: 30.7046,
      lng: 76.7179,
      categories: JSON.stringify({ primary: 'hair', related: ['nails', 'beauty'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-hairspace/800/400']),
    },
  });

  // Mohali Salon 2: Cleopatra (Phase 5)
  const salonMohali2 = await prisma.salon.create({
    data: {
      name: 'Cleopatra Beauty Lounge',
      address: 'SCO 18, Mohali Stadium Road, Phase 5, Mohali, Punjab 160059',
      ownerId: seller9.id,
      openTime: '10:00',
      closeTime: '20:00',
      lat: 30.7110,
      lng: 76.7210,
      categories: JSON.stringify({ primary: 'beauty', related: ['spa', 'hair'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-cleopatra/800/400']),
    },
  });

  // Mohali Salon 3: Good Looks (Phase 5)
  const salonMohali3 = await prisma.salon.create({
    data: {
      name: 'Good Looks Salon',
      address: 'SCF 62, First Floor, Sector 59, Phase 5, Mohali, Punjab 160059',
      ownerId: seller10.id,
      openTime: '10:00',
      closeTime: '21:00',
      lat: 30.7075,
      lng: 76.7250,
      categories: JSON.stringify({ primary: 'hair', related: ['barber', 'beauty'] }),
      images: JSON.stringify(['https://picsum.photos/seed/salon-goodlooks/800/400']),
    },
  });

  // --- DELHI SALON SERVICES ---
  const delhiSalonServices: { salon: any; services: { name: string; variants: { targetGender: 'MALE' | 'FEMALE' | 'UNISEX'; price: number; duration: number }[] }[] }[] = [
    {
      salon: salonDelhi1,
      services: [
        { name: 'Haircut & Styling', variants: [{ targetGender: 'MALE', price: 99, duration: 30 }, { targetGender: 'FEMALE', price: 149, duration: 45 }] },
        { name: 'Hair Smoothening', variants: [{ targetGender: 'UNISEX', price: 999, duration: 180 }] },
        { name: 'Facial', variants: [{ targetGender: 'MALE', price: 199, duration: 45 }, { targetGender: 'FEMALE', price: 249, duration: 60 }] },
        { name: 'Hair Colour', variants: [{ targetGender: 'UNISEX', price: 399, duration: 90 }] },
      ],
    },
    {
      salon: salonDelhi2,
      services: [
        { name: 'Premium Haircut', variants: [{ targetGender: 'MALE', price: 149, duration: 30 }, { targetGender: 'FEMALE', price: 249, duration: 60 }] },
        { name: 'Keratin Treatment', variants: [{ targetGender: 'UNISEX', price: 1499, duration: 240 }] },
        { name: 'Bridal Makeup', variants: [{ targetGender: 'FEMALE', price: 2999, duration: 180 }] },
        { name: 'D-Tan Pack', variants: [{ targetGender: 'UNISEX', price: 299, duration: 45 }] },
        { name: 'Manicure & Pedicure', variants: [{ targetGender: 'UNISEX', price: 399, duration: 75 }] },
      ],
    },
    {
      salon: salonDelhi3,
      services: [
        { name: 'Haircut', variants: [{ targetGender: 'MALE', price: 99, duration: 30 }, { targetGender: 'FEMALE', price: 199, duration: 45 }] },
        { name: 'Beard Grooming', variants: [{ targetGender: 'MALE', price: 79, duration: 20 }] },
        { name: 'Hair Spa', variants: [{ targetGender: 'UNISEX', price: 349, duration: 60 }] },
        { name: 'Global Hair Colour', variants: [{ targetGender: 'UNISEX', price: 599, duration: 120 }] },
        { name: 'Straightening', variants: [{ targetGender: 'UNISEX', price: 1299, duration: 180 }] },
      ],
    },
    {
      salon: salonDelhi4,
      services: [
        { name: 'Haircut & Blow Dry', variants: [{ targetGender: 'FEMALE', price: 199, duration: 60 }] },
        { name: "Men's Grooming Package", variants: [{ targetGender: 'MALE', price: 199, duration: 45 }] },
        { name: 'Waxing Full Arms', variants: [{ targetGender: 'FEMALE', price: 149, duration: 30 }] },
        { name: 'Nail Art', variants: [{ targetGender: 'FEMALE', price: 299, duration: 45 }] },
        { name: 'Clean Up Facial', variants: [{ targetGender: 'UNISEX', price: 249, duration: 40 }] },
      ],
    },
    {
      salon: salonDelhi5,
      services: [
        { name: 'Luxury Haircut', variants: [{ targetGender: 'MALE', price: 249, duration: 40 }, { targetGender: 'FEMALE', price: 399, duration: 60 }] },
        { name: 'Hydra Facial', variants: [{ targetGender: 'UNISEX', price: 799, duration: 60 }] },
        { name: 'Botox Hair Treatment', variants: [{ targetGender: 'UNISEX', price: 1999, duration: 120 }] },
        { name: 'Party Makeup', variants: [{ targetGender: 'FEMALE', price: 999, duration: 90 }] },
      ],
    },
  ];

  // --- MOHALI SALON SERVICES ---
  const mohaliSalonServices: typeof delhiSalonServices = [
    {
      salon: salonMohali1,
      services: [
        { name: 'Haircut & Styling', variants: [{ targetGender: 'MALE', price: 149, duration: 30 }, { targetGender: 'FEMALE', price: 249, duration: 50 }] },
        { name: 'Hair Colour', variants: [{ targetGender: 'UNISEX', price: 499, duration: 90 }] },
        { name: 'Hair Spa', variants: [{ targetGender: 'UNISEX', price: 349, duration: 60 }] },
        { name: 'Facial Gold', variants: [{ targetGender: 'UNISEX', price: 299, duration: 45 }] },
        { name: 'Nail Extensions', variants: [{ targetGender: 'FEMALE', price: 599, duration: 60 }] },
      ],
    },
    {
      salon: salonMohali2,
      services: [
        { name: 'Bridal Package', variants: [{ targetGender: 'FEMALE', price: 3999, duration: 300 }] },
        { name: 'Hair Straightening', variants: [{ targetGender: 'UNISEX', price: 999, duration: 180 }] },
        { name: 'Cleanup Facial', variants: [{ targetGender: 'UNISEX', price: 199, duration: 40 }] },
        { name: 'Full Body Waxing', variants: [{ targetGender: 'FEMALE', price: 599, duration: 90 }] },
        { name: 'Hair Wash & Blow Dry', variants: [{ targetGender: 'FEMALE', price: 149, duration: 30 }] },
      ],
    },
    {
      salon: salonMohali3,
      services: [
        { name: 'Haircut', variants: [{ targetGender: 'MALE', price: 99, duration: 25 }, { targetGender: 'FEMALE', price: 149, duration: 45 }] },
        { name: 'Beard Trim & Shape', variants: [{ targetGender: 'MALE', price: 49, duration: 15 }] },
        { name: 'Highlights', variants: [{ targetGender: 'UNISEX', price: 799, duration: 120 }] },
        { name: 'Threading', variants: [{ targetGender: 'UNISEX', price: 29, duration: 10 }] },
      ],
    },
  ];

  // Create all Delhi + Mohali services
  const allNewSalonServices = [...delhiSalonServices, ...mohaliSalonServices];
  const allNewServiceRefs: { salonId: string; services: any[] }[] = [];

  for (const entry of allNewSalonServices) {
    const createdServices = [];
    for (const s of entry.services) {
      const svc = await prisma.service.create({
        data: {
          name: s.name,
          salonId: entry.salon.id,
          variants: { create: s.variants },
        },
        include: { variants: true },
      });
      createdServices.push(svc);
    }
    allNewServiceRefs.push({ salonId: entry.salon.id, services: createdServices });
  }

  // --- DELHI + MOHALI STAFF ---
  const delhiMohaliStaff = [
    { name: 'Rahul Mehra', salonId: salonDelhi1.id, skills: 'Hair Stylist, Color Expert' },
    { name: 'Pooja Rani', salonId: salonDelhi1.id, skills: 'Facial Specialist, Nail Artist' },
    { name: 'Deepak Rawat', salonId: salonDelhi2.id, skills: 'Senior Stylist, Keratin Specialist' },
    { name: 'Anjali Saxena', salonId: salonDelhi2.id, skills: 'Bridal Makeup, Skin Care' },
    { name: 'Mohit Taneja', salonId: salonDelhi3.id, skills: 'Master Barber, Hair Expert' },
    { name: 'Ritika Jain', salonId: salonDelhi3.id, skills: 'Hair Spa, Colour Specialist' },
    { name: 'Suresh Kumar', salonId: salonDelhi4.id, skills: 'Grooming Expert, Stylist' },
    { name: 'Manisha Thakur', salonId: salonDelhi4.id, skills: 'Nail Art, Waxing Specialist' },
    { name: 'Karan Malhotra', salonId: salonDelhi5.id, skills: 'Celebrity Stylist, Botox Expert' },
    { name: 'Jasleen Kaur', salonId: salonMohali1.id, skills: 'Hair Stylist, Nail Extensions' },
    { name: 'Gurpreet Singh', salonId: salonMohali1.id, skills: 'Barber, Color Expert' },
    { name: 'Manpreet Kaur', salonId: salonMohali2.id, skills: 'Bridal Specialist, Skin Care' },
    { name: 'Rajveer Sidhu', salonId: salonMohali3.id, skills: 'Hair Stylist, Beard Specialist' },
  ];

  const createdStaffMembers = [];
  for (const s of delhiMohaliStaff) {
    const staff = await prisma.staff.create({ data: s });
    createdStaffMembers.push(staff);
  }

  // Link staff to services of their respective salons
  for (const staffMember of createdStaffMembers) {
    const salonEntry = allNewServiceRefs.find(e => e.salonId === staffMember.salonId);
    if (salonEntry) {
      for (const svc of salonEntry.services) {
        await prisma.staffService.create({
          data: { staffId: staffMember.id, serviceId: svc.id },
        });
      }
    }
  }

  // Add availability for all new staff (Mon-Sat, 10-8 for Delhi; Mon-Sun 10-9 for Mohali)
  const mohaliSalonIds = [salonMohali1.id, salonMohali2.id, salonMohali3.id];
  for (const staff of createdStaffMembers) {
    const isMohali = mohaliSalonIds.includes(staff.salonId);
    const days = isMohali ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    for (const day of days) {
      await prisma.staffAvailability.create({
        data: {
          staffId: staff.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: isMohali ? '21:00' : '20:00',
        },
      });
    }
  }

  // --- DELHI + MOHALI REVIEWS ---
  // Create a couple more customers for reviews
  const customer3 = await prisma.user.create({
    data: { name: 'Rohit Sharma', email: 'customer3@example.com', phone: '9870001111', password: hashedPassword, role: 'CUSTOMER', gender: 'MALE' },
  });
  const customer4 = await prisma.user.create({
    data: { name: 'Sneha Patel', email: 'customer4@example.com', phone: '9870002222', password: hashedPassword, role: 'CUSTOMER', gender: 'FEMALE' },
  });
  const customer5 = await prisma.user.create({
    data: { name: 'Arjun Reddy', email: 'customer5@example.com', phone: '9870003333', password: hashedPassword, role: 'CUSTOMER', gender: 'MALE' },
  });

  const newReviews = [
    { userId: customer3.id, salonId: salonDelhi1.id, rating: 4, comment: 'Great haircut at very affordable price. Staff is friendly. Will visit again!' },
    { userId: customer4.id, salonId: salonDelhi1.id, rating: 5, comment: 'Best salon in Lajpat Nagar! Amazing smoothening results.' },
    { userId: customer3.id, salonId: salonDelhi2.id, rating: 5, comment: 'Loved the keratin treatment. My hair feels amazing!' },
    { userId: customer4.id, salonId: salonDelhi2.id, rating: 4, comment: 'Professional staff and clean ambiance. Little pricey but worth it.' },
    { userId: customer5.id, salonId: salonDelhi3.id, rating: 4, comment: 'Good experience at Vegas Mall location. Beard grooming was excellent.' },
    { userId: customer3.id, salonId: salonDelhi3.id, rating: 5, comment: 'Hair Masters never disappoints. 41% off was a steal!' },
    { userId: customer4.id, salonId: salonDelhi4.id, rating: 4, comment: 'Nice nail art work. They have good variety of designs.' },
    { userId: customer5.id, salonId: salonDelhi5.id, rating: 5, comment: 'The hydra facial here is worth every penny. Skin felt amazing for days.' },
    { userId: customer3.id, salonId: salonMohali1.id, rating: 5, comment: 'Best salon in Mohali Phase 3B2. Jasleen is very talented!' },
    { userId: customer4.id, salonId: salonMohali1.id, rating: 4, comment: 'Good haircut and the nail extensions lasted weeks. Recommended!' },
    { userId: customer5.id, salonId: salonMohali2.id, rating: 5, comment: 'Went for bridal trial and it was perfect. Booked the full package!' },
    { userId: customer3.id, salonId: salonMohali3.id, rating: 4, comment: 'Quick and clean haircut. Very affordable prices in Mohali.' },
    { userId: customer5.id, salonId: salonMohali3.id, rating: 3, comment: 'Decent service. Wait time can be long on weekends.' },
  ];

  for (const r of newReviews) {
    await prisma.review.create({ data: r });
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
