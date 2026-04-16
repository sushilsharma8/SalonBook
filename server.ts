import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient, ServiceTargetGender, UserGender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const moduleUrl = import.meta.url;
const __dirname = moduleUrl.startsWith('file:')
  ? path.dirname(fileURLToPath(moduleUrl))
  : process.cwd();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// --- Utility Functions for Slot Engine ---
function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isOverlapping(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function mapUserGenderToServiceTarget(gender: UserGender): ServiceTargetGender | null {
  if (gender === 'FEMALE') return 'FEMALE';
  if (gender === 'MALE') return 'MALE';
  return null;
}

function normalizeUserGender(value: unknown): UserGender | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  if (normalized === 'MALE' || normalized === 'FEMALE' || normalized === 'OTHER') {
    return normalized as UserGender;
  }
  return null;
}

type ResolvedServiceVariant = {
  serviceId: string;
  serviceName: string;
  variantId: string;
  targetGender: ServiceTargetGender;
  price: number;
  duration: number;
};

async function resolveServiceVariantsForUser(
  prismaClient: PrismaClient,
  serviceIds: string[],
  userGender: UserGender
): Promise<ResolvedServiceVariant[]> {
  const services = await prismaClient.service.findMany({
    where: { id: { in: serviceIds } },
    include: { variants: true },
  });

  if (services.length !== serviceIds.length || services.length === 0) {
    throw new Error('One or more services not found');
  }

  const requestedGender = mapUserGenderToServiceTarget(userGender);
  const resolved = services.map((service) => {
    const exact = requestedGender
      ? service.variants.find((v) => v.targetGender === requestedGender)
      : null;
    const fallback = service.variants.find((v) => v.targetGender === 'UNISEX');
    const chosen = exact ?? fallback;
    if (!chosen) {
      throw new Error(`Service "${service.name}" is not available for your profile gender`);
    }
    return {
      serviceId: service.id,
      serviceName: service.name,
      variantId: chosen.id,
      targetGender: chosen.targetGender,
      price: chosen.price,
      duration: chosen.duration,
    };
  });

  const serviceOrder = new Map(serviceIds.map((id, index) => [id, index]));
  resolved.sort((a, b) => (serviceOrder.get(a.serviceId) ?? 0) - (serviceOrder.get(b.serviceId) ?? 0));
  return resolved;
}

// --- Slot Generator ---
async function getAvailableSlots(
  prisma: PrismaClient,
  salonId: string,
  serviceIdsStr: string,
  date: string,
  userGender: UserGender,
  staffId?: string
) {
  const serviceIds = serviceIdsStr.split(',');
  const services = await resolveServiceVariantsForUser(prisma, serviceIds, userGender);
  const duration = services.reduce((acc, s) => acc + s.duration, 0);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { openTime: true, closeTime: true },
  });
  if (!salon) {
    throw new Error('Salon not found');
  }

  const staffList = await prisma.staff.findMany({
    where: {
      salonId,
      isActive: true,
      ...(staffId ? { id: staffId } : {}),
      AND: serviceIds.map(id => ({
        services: { some: { serviceId: id } }
      }))
    },
    include: {
      availability: true,
      timeOff: true,
      bookings: true,
    },
  });

  // Parse date string "YYYY-MM-DD" safely as UTC
  const [year, month, d] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, d));
  const day = dateObj.getUTCDay();
  
  let slotMap = new Map<string, boolean>();

  for (const staff of staffList) {
    // Support both 0-6 (Sun-Sat) and 1-7 (Mon-Sun) encodings in existing DBs.
    const legacyDay = day === 0 ? 7 : day;
    const availability =
      staff.availability.find((a) => a.dayOfWeek === day) ??
      staff.availability.find((a) => a.dayOfWeek === legacyDay) ??
      // Back-compat fallback: if no availability rows exist at all, assume salon hours.
      (staff.availability.length === 0
        ? { dayOfWeek: day, startTime: salon.openTime, endTime: salon.closeTime }
        : undefined);
    if (!availability) continue;

    let start = timeToMinutes(availability.startTime);
    let end = timeToMinutes(availability.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;

    const bookings = staff.bookings.filter(b => {
      // Compare dates using UTC to avoid timezone issues
      const bDate = new Date(b.startTime);
      const bDateStr = `${bDate.getUTCFullYear()}-${String(bDate.getUTCMonth() + 1).padStart(2, '0')}-${String(bDate.getUTCDate()).padStart(2, '0')}`;
      if (bDateStr !== date) return false;
      
      if (b.status === 'CANCELLED') return false;
      if (b.status === 'PENDING') {
        const ageInMinutes = (new Date().getTime() - new Date(b.createdAt).getTime()) / 60000;
        if (ageInMinutes > 15) return false;
      }
      return true;
    });

    while (start + duration <= end) {
      let slotEnd = start + duration;

      let conflict = bookings.some(b => {
        const bStart = new Date(b.startTime).getUTCHours() * 60 + new Date(b.startTime).getUTCMinutes();
        const bEnd = new Date(b.endTime).getUTCHours() * 60 + new Date(b.endTime).getUTCMinutes();

        return isOverlapping(start, slotEnd, bStart, bEnd);
      });

      const timeStr = minutesToTime(start);
      if (!conflict) {
        slotMap.set(timeStr, true);
      } else {
        if (!slotMap.has(timeStr)) {
          slotMap.set(timeStr, false);
        }
      }

      start += 15; // step size
    }
  }

  const result = Array.from(slotMap.entries()).map(([time, available]) => ({ time, available }));
  result.sort((a, b) => a.time.localeCompare(b.time));
  return result;
}

// --- Safe Booking API ---
async function createBooking(prisma: PrismaClient, data: any) {
  const { staffId, salonId, startTime, duration, totalAmount, resolvedServices } = data;

  const endTime = new Date(new Date(startTime).getTime() + duration * 60000);

  return await prisma.$transaction(async (tx) => {
    const fifteenMinsAgo = new Date(new Date().getTime() - 15 * 60000);

    const startDate = new Date(startTime);
    const day = startDate.getUTCDay();
    const startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    const endMinutes = startMinutes + duration;

    const serviceIds = resolvedServices.map((s: ResolvedServiceVariant) => s.serviceId);

    const staffIdToUse: string = (() => {
      if (staffId) return staffId;
      return "";
    })();

    const resolveStaffId = async () => {
      if (staffIdToUse) return staffIdToUse;

      const candidates = await tx.staff.findMany({
        where: {
          salonId,
          isActive: true,
          AND: serviceIds.map((id) => ({
            services: { some: { serviceId: id } },
          })),
        },
        include: { availability: true },
      });

      for (const candidate of candidates) {
        const availability = candidate.availability.find((a) => a.dayOfWeek === day);
        if (!availability) continue;

        const availStart = timeToMinutes(availability.startTime);
        const availEnd = timeToMinutes(availability.endTime);

        if (startMinutes < availStart || endMinutes > availEnd) continue;

        const conflict = await tx.booking.findFirst({
          where: {
            staffId: candidate.id,
            startTime: { lt: endTime },
            endTime: { gt: startDate },
            OR: [
              { status: "CONFIRMED" },
              { status: "PENDING", createdAt: { gt: fifteenMinsAgo } },
            ],
          },
        });

        if (!conflict) return candidate.id;
      }

      throw new Error("No available professional for the selected slot");
    };

    const resolvedStaffId = await resolveStaffId();

    // Double-check conflict even when staffId was provided (race condition safety)
    const conflict = await tx.booking.findFirst({
      where: {
        staffId: resolvedStaffId,
        startTime: { lt: endTime },
        endTime: { gt: startDate },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", createdAt: { gt: fifteenMinsAgo } },
        ],
      },
    });

    if (conflict) {
      throw new Error("Slot already booked");
    }

    // If a staffId was provided, ensure they are actually available for that slot.
    if (staffIdToUse) {
      const staffAvailability = await tx.staff.findUnique({
        where: { id: resolvedStaffId },
        select: { availability: true },
      });
      const availability = staffAvailability?.availability.find((a) => a.dayOfWeek === day);
      if (!availability) {
        throw new Error("Selected professional is not available on this day");
      }
      const availStart = timeToMinutes(availability.startTime);
      const availEnd = timeToMinutes(availability.endTime);
      if (startMinutes < availStart || endMinutes > availEnd) {
        throw new Error("Selected professional is not available for this time");
      }
    }

    const actionToken = crypto.randomBytes(32).toString('hex');

    return tx.booking.create({
      data: {
        userId: data.userId,
        salonId: data.salonId,
        staffId: resolvedStaffId,
        startTime: new Date(startTime),
        endTime,
        totalAmount,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        actionToken,
        services: {
          create: resolvedServices.map((service: ResolvedServiceVariant) => ({
            service: { connect: { id: service.serviceId } },
            variant: { connect: { id: service.variantId } },
            serviceNameAtBooking: service.serviceName,
            targetGenderAtBooking: service.targetGender,
            priceAtBooking: service.price,
            durationAtBooking: service.duration,
          }))
        }
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });
  }, {
    // Booking assignment may scan multiple staff/conflicts; default 5s is too tight.
    maxWait: 10_000,
    timeout: 20_000,
  });
}

export async function createApp() {
  const app = express();
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const salonUploadsDir = path.join(uploadsRoot, 'salons');

  if (!fs.existsSync(salonUploadsDir)) {
    fs.mkdirSync(salonUploadsDir, { recursive: true });
  }

  const salonImageUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, salonUploadsDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 20,
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use('/uploads', express.static(uploadsRoot));

  // --- API Routes ---

  // Auth
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, phone, gender } = req.body;

      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      const phoneDigits = String(phone).replace(/\D/g, '');
      if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
        return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        return res.status(400).json({ error: 'Enter a valid email address' });
      }

      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      if (role && !['CUSTOMER', 'SELLER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const normalizedRole = role || 'CUSTOMER';
      const normalizedGender = gender ? String(gender).toUpperCase() : undefined;
      if (normalizedGender && !['MALE', 'FEMALE', 'OTHER'].includes(normalizedGender)) {
        return res.status(400).json({ error: 'Invalid gender' });
      }
      if (normalizedRole === 'CUSTOMER' && !normalizedGender) {
        return res.status(400).json({ error: 'Gender is required for customer signup' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: normalizedRole,
          phone,
          gender: normalizedRole === 'CUSTOMER' ? (normalizedGender as UserGender | undefined) ?? null : null,
        },
      });
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, gender: user.gender },
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      if (!user.isActive) return res.status(403).json({ error: 'Your account is deactivated. Please contact support.' });
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, gender: user.gender },
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Middleware to check auth
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      const activeUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true, role: true },
      });
      if (!activeUser) {
        return res.status(401).json({ error: 'User not found' });
      }
      if (!activeUser.isActive) {
        return res.status(403).json({ error: 'Your account is deactivated. Please contact support.' });
      }
      req.user = { userId: payload.userId, role: activeUser.role };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Salons
  app.get('/api/salons', async (req: Request, res: Response) => {
    try {
      const salons = await prisma.salon.findMany({
        include: { services: { include: { variants: true } }, reviews: true }
      });
      res.json(salons);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch salons' });
    }
  });

  app.get('/api/salons/:id', async (req: Request, res: Response) => {
    try {
      const salon = await prisma.salon.findUnique({
        where: { id: req.params.id },
        include: { 
          services: { include: { variants: true } }, 
          staff: {
            where: { isActive: true },
            include: { services: true }
          }, 
          reviews: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
          },
          owner: {
            select: { name: true, phone: true }
          }
        }
      });
      if (!salon) return res.status(404).json({ error: 'Salon not found' });
      res.json(salon);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch salon details' });
    }
  });

  // Seller: Get My Salon
  app.get('/api/seller/salon', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({
        where: { ownerId: req.user.userId },
        include: {
          services: { include: { variants: true } },
          staff: { where: { isActive: true } }
        }
      });
      res.json(salon || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch salon' });
    }
  });

  // Seller: Create/Update Salon
  app.post('/api/seller/salon', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, address, categories, images, openTime, closeTime } = req.body;
    
    try {
      let salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (salon) {
        salon = await prisma.salon.update({
          where: { id: salon.id },
          data: { name, address, categories, images, openTime, closeTime }
        });
      } else {
        salon = await prisma.salon.create({
          data: { name, address, categories, images, openTime, closeTime, ownerId: req.user.userId }
        });
      }
      res.json(salon);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save salon' });
    }
  });

  app.post('/api/seller/upload-images', requireAuth, (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });

    salonImageUpload.array('images', 20)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Each image must be 15MB or smaller' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }

      const urls = files.map((file) => `/uploads/salons/${file.filename}`);
      return res.json({ urls });
    });
  });

  // Seller: Manage Services
  app.post('/api/seller/services', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, variants } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'At least one service variant is required' });
      }

      const normalizedVariants = variants.map((variant: any) => ({
        targetGender: String(variant.targetGender || '').toUpperCase(),
        price: Number(variant.price),
        duration: Number(variant.duration),
      }));

      const seenGenders = new Set<string>();
      for (const variant of normalizedVariants) {
        if (!['MALE', 'FEMALE', 'UNISEX'].includes(variant.targetGender)) {
          return res.status(400).json({ error: 'Invalid variant gender. Use MALE, FEMALE, or UNISEX.' });
        }
        if (!Number.isFinite(variant.price) || variant.price <= 0 || !Number.isInteger(variant.price)) {
          return res.status(400).json({ error: 'Variant price must be a positive whole number.' });
        }
        if (!Number.isFinite(variant.duration) || variant.duration <= 0 || !Number.isInteger(variant.duration)) {
          return res.status(400).json({ error: 'Variant duration must be a positive whole number in minutes.' });
        }
        if (seenGenders.has(variant.targetGender)) {
          return res.status(400).json({ error: 'Duplicate variant gender for one service is not allowed.' });
        }
        seenGenders.add(variant.targetGender);
      }

      // Backward-compatible defaults for DBs where Service.price/duration are still NOT NULL.
      const baseVariant = normalizedVariants[0];
      
      const service = await prisma.service.create({
        data: {
          name,
          salonId: salon.id,
          price: baseVariant.price,
          duration: baseVariant.duration,
          variants: {
            create: normalizedVariants.map((variant) => ({
              targetGender: variant.targetGender as ServiceTargetGender,
              price: variant.price,
              duration: variant.duration,
            })),
          },
        },
        include: { variants: true },
      });

      // Auto-link new service to all existing staff in this salon
      const salonStaff = await prisma.staff.findMany({ where: { salonId: salon.id }, select: { id: true } });
      if (salonStaff.length > 0) {
        await prisma.staffService.createMany({
          data: salonStaff.map(s => ({ staffId: s.id, serviceId: service.id })),
          skipDuplicates: true,
        });
      }

      res.json(service);
    } catch (error: any) {
      console.error('Failed to add service:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Failed to add service';
      res.status(500).json({ error: message });
    }
  });

  // Seller: Manage Staff
  app.post('/api/seller/staff', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, skills, gender } = req.body;
    try {
      const normalizedGender = normalizeUserGender(gender);
      if (gender && !normalizedGender) {
        return res.status(400).json({ error: 'Invalid gender. Use MALE, FEMALE, or OTHER.' });
      }

      const salon = await prisma.salon.findFirst({
        where: { ownerId: req.user.userId },
        include: { services: true }
      });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });
      
      const staff = await prisma.staff.create({
        data: { name, skills, gender: normalizedGender, salonId: salon.id }
      });

      // Auto-create default availability (Mon-Sat, matching salon hours)
      const availabilityDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat
      await prisma.staffAvailability.createMany({
        data: availabilityDays.map(day => ({
          staffId: staff.id,
          dayOfWeek: day,
          startTime: salon.openTime,
          endTime: salon.closeTime,
        })),
      });

      // Auto-link staff to all existing salon services
      if (salon.services.length > 0) {
        await prisma.staffService.createMany({
          data: salon.services.map(svc => ({
            staffId: staff.id,
            serviceId: svc.id,
          })),
        });
      }

      res.json(staff);
    } catch (error) {
      console.error('Failed to add staff:', error);
      res.status(500).json({ error: 'Failed to add staff' });
    }
  });

  app.delete('/api/seller/services/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });
      
      await prisma.service.deleteMany({
        where: { id: req.params.id, salonId: salon.id }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete service' });
    }
  });

  app.delete('/api/seller/staff/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const staff = await prisma.staff.findFirst({
        where: { id: req.params.id, salonId: salon.id }
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });

      await prisma.$transaction(async (tx) => {
        await tx.staffAvailability.deleteMany({ where: { staffId: staff.id } });
        await tx.staffTimeOff.deleteMany({ where: { staffId: staff.id } });
        await tx.staffService.deleteMany({ where: { staffId: staff.id } });
        await tx.staff.update({
          where: { id: staff.id },
          data: { isActive: false },
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete staff:', error);
      res.status(500).json({ error: 'Failed to delete staff' });
    }
  });

  // Bookings
  app.get('/api/slots', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Only customers can view booking slots' });
      const { salonId, serviceIds, date, staffId } = req.query;
      if (!salonId || !serviceIds || !date) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { gender: true } });
      if (!currentUser?.gender) {
        return res.status(400).json({ error: 'Please complete your profile gender before checking slots.' });
      }
      const slots = await getAvailableSlots(
        prisma,
        String(salonId),
        String(serviceIds),
        String(date),
        currentUser.gender,
        staffId ? String(staffId) : undefined
      );
      res.json({ slots });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch slots' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Only customers can book services' });
    const { salonId, serviceIds, staffId, time } = req.body;
    try {
      if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ error: 'No services selected' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { gender: true } });
      if (!currentUser?.gender) {
        return res.status(400).json({ error: 'Please complete your profile gender before booking.' });
      }

      const resolvedServices = await resolveServiceVariantsForUser(prisma, serviceIds, currentUser.gender);
      const totalDuration = resolvedServices.reduce((acc, s) => acc + s.duration, 0);
      const totalPrice = resolvedServices.reduce((acc, s) => acc + s.price, 0);

      const booking = await createBooking(prisma, {
        userId: req.user.userId,
        salonId,
        resolvedServices,
        staffId,
        startTime: time,
        duration: totalDuration,
        totalAmount: totalPrice
      });
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Booking failed' });
    }
  });

  app.get('/api/bookings/my', requireAuth, async (req: Request, res: Response) => {
    try {
      const bookings = await prisma.booking.findMany({
        where: { userId: req.user.userId },
        include: { 
          salon: {
            include: {
              owner: { select: { name: true, phone: true } }
            }
          }, 
          services: { include: { service: true } }, 
          staff: true 
        },
        orderBy: { startTime: 'desc' }
      });
      
      // Also fetch reviews by this user to know which bookings have been reviewed
      const reviews = await prisma.review.findMany({
        where: { userId: req.user.userId }
      });
      
      res.json({ bookings, reviews });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.get('/api/seller/bookings', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.json([]);
      
      const bookings = await prisma.booking.findMany({
        where: { salonId: salon.id },
        include: { user: true, services: { include: { service: true } }, staff: true },
        orderBy: { startTime: 'desc' }
      });
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.put('/api/bookings/:id/status', requireAuth, async (req: Request, res: Response) => {
    const { status } = req.body;
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!allowedStatuses.includes(String(status))) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
        include: { salon: true }
      });
      
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      
      // Authorization check
      const isOwner = booking.userId === req.user.userId;
      const isSalonOwner = booking.salon.ownerId === req.user.userId;
      const isAdmin = req.user.role === 'ADMIN';
      
      if (!isOwner && !isSalonOwner && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Restriction: Customers can only cancel
      if (isOwner && !isSalonOwner && !isAdmin && status !== 'CANCELLED') {
        return res.status(403).json({ error: 'Customers can only cancel bookings' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedBooking = await tx.booking.update({
          where: { id: req.params.id },
          data: { status }
        });

        if (status !== 'NO_SHOW' || booking.status === 'NO_SHOW') {
          return { updatedBooking, accountDeactivated: false };
        }

        const noShowCount = await tx.booking.count({
          where: { userId: booking.userId, status: 'NO_SHOW' },
        });

        if (noShowCount > 3) {
          await tx.user.update({
            where: { id: booking.userId },
            data: { isActive: false, noShowCount },
          });
          return { updatedBooking, accountDeactivated: true, noShowCount };
        }

        await tx.user.update({
          where: { id: booking.userId },
          data: { noShowCount },
        });
        return { updatedBooking, accountDeactivated: false, noShowCount };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Reviews
  app.post('/api/reviews', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Only customers can leave reviews' });
    const { salonId, rating, comment } = req.body;
    try {
      // Check if user has a completed booking for this salon
      const completedBooking = await prisma.booking.findFirst({
        where: {
          userId: req.user.userId,
          salonId,
          status: 'COMPLETED'
        }
      });
      
      if (!completedBooking) {
        return res.status(400).json({ error: 'You can only review salons you have visited.' });
      }

      const review = await prisma.review.create({
        data: {
          userId: req.user.userId,
          salonId,
          rating: parseInt(rating),
          comment
        }
      });
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });

  // Admin
  app.get('/api/admin/stats', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const [users, salons, bookings, revenueData] = await Promise.all([
        prisma.user.count(),
        prisma.salon.count(),
        prisma.booking.count(),
        prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { totalAmount: true }
        })
      ]);
      res.json({
        users,
        salons,
        bookings,
        revenue: revenueData._sum.totalAmount || 0
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/admin/activity', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const recentBookings = await prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          salon: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } }
        }
      });
      res.json(recentBookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin activity' });
    }
  });

  // Update user profile
  app.put('/api/users/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, phone, gender } = req.body;
      const normalizedGender = gender ? String(gender).toUpperCase() : null;
      if (normalizedGender && !['MALE', 'FEMALE', 'OTHER'].includes(normalizedGender)) {
        return res.status(400).json({ error: 'Invalid gender' });
      }
      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { name, phone, gender: normalizedGender as UserGender | null }
      });
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, gender: user.gender });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Admin: Get all users
  app.get('/api/admin/users', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isActive: true, noShowCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Admin: Reactivate user account
  app.post('/api/admin/users/:id/reactivate', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.role === 'ADMIN') return res.status(400).json({ error: 'Admin accounts cannot be reactivated via this endpoint' });

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: true },
        select: { id: true, isActive: true, noShowCount: true },
      });

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reactivate user' });
    }
  });

  // Admin: Delete user
  app.delete('/api/admin/users/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      // Find user to check role
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.role === 'ADMIN') return res.status(400).json({ error: 'Cannot delete admin' });

      // Delete related records in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete user's bookings
        await tx.booking.deleteMany({ where: { userId: user.id } });
        // Delete user's reviews
        await tx.review.deleteMany({ where: { userId: user.id } });
        
        if (user.role === 'SELLER') {
          // Find salons owned by seller
          const salons = await tx.salon.findMany({ where: { ownerId: user.id } });
          const salonIds = salons.map(s => s.id);
          
          if (salonIds.length > 0) {
            // Delete salon related records
            await tx.booking.deleteMany({ where: { salonId: { in: salonIds } } });
            await tx.review.deleteMany({ where: { salonId: { in: salonIds } } });
            await tx.staffAvailability.deleteMany({ where: { staff: { salonId: { in: salonIds } } } });
            await tx.staffTimeOff.deleteMany({ where: { staff: { salonId: { in: salonIds } } } });
            await tx.staffService.deleteMany({ where: { staff: { salonId: { in: salonIds } } } });
            await tx.service.deleteMany({ where: { salonId: { in: salonIds } } });
            await tx.staff.deleteMany({ where: { salonId: { in: salonIds } } });
            // Delete salons
            await tx.salon.deleteMany({ where: { ownerId: user.id } });
          }
        }
        
        // Finally, delete the user
        await tx.user.delete({ where: { id: user.id } });
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Admin: Get all salons
  app.get('/api/admin/salons', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salons = await prisma.salon.findMany({
        include: { owner: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(salons);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch salons' });
    }
  });

  // Admin: Delete salon
  app.delete('/api/admin/salons/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      await prisma.$transaction(async (tx) => {
        const salonId = req.params.id;
        await tx.booking.deleteMany({ where: { salonId } });
        await tx.review.deleteMany({ where: { salonId } });
        await tx.staffAvailability.deleteMany({ where: { staff: { salonId } } });
        await tx.staffTimeOff.deleteMany({ where: { staff: { salonId } } });
        await tx.staffService.deleteMany({ where: { staff: { salonId } } });
        await tx.service.deleteMany({ where: { salonId } });
        await tx.staff.deleteMany({ where: { salonId } });
        await tx.salon.delete({ where: { id: salonId } });
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting salon:', error);
      res.status(500).json({ error: 'Failed to delete salon' });
    }
  });

  // Admin: Get single salon with full details for management
  app.get('/api/admin/salons/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findUnique({
        where: { id: req.params.id },
        include: {
          owner: { select: { name: true, email: true, phone: true } },
          services: { include: { variants: true } },
          staff: { where: { isActive: true } },
          bookings: {
            include: { user: { select: { name: true, phone: true } }, services: { include: { service: true } }, staff: true },
            orderBy: { startTime: 'desc' },
            take: 50
          }
        }
      });
      if (!salon) return res.status(404).json({ error: 'Salon not found' });
      res.json(salon);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch salon' });
    }
  });

  // Admin: Update salon details
  app.put('/api/admin/salons/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { name, address, openTime, closeTime, images, categories } = req.body;
    try {
      const salon = await prisma.salon.update({
        where: { id: req.params.id },
        data: { name, address, openTime, closeTime, images, categories }
      });
      res.json(salon);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update salon' });
    }
  });

  // Admin: Add service to any salon
  app.post('/api/admin/salons/:id/services', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { name, variants } = req.body;
    try {
      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'At least one variant required' });
      }
      const service = await prisma.service.create({
        data: {
          name,
          salonId: req.params.id,
          price: Number(variants[0].price),
          duration: Number(variants[0].duration),
          variants: {
            create: variants.map((v: any) => ({
              targetGender: String(v.targetGender).toUpperCase() as ServiceTargetGender,
              price: Number(v.price),
              duration: Number(v.duration),
            })),
          },
        },
        include: { variants: true },
      });
      const salonStaff = await prisma.staff.findMany({ where: { salonId: req.params.id }, select: { id: true } });
      if (salonStaff.length > 0) {
        await prisma.staffService.createMany({
          data: salonStaff.map(s => ({ staffId: s.id, serviceId: service.id })),
          skipDuplicates: true,
        });
      }
      res.json(service);
    } catch (error) {
      console.error('Admin add service error:', error);
      res.status(500).json({ error: 'Failed to add service' });
    }
  });

  // Admin: Delete service from any salon
  app.delete('/api/admin/salons/:salonId/services/:serviceId', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      await prisma.service.deleteMany({ where: { id: req.params.serviceId, salonId: req.params.salonId } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete service' });
    }
  });

  // Admin: Add staff to any salon
  app.post('/api/admin/salons/:id/staff', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { name, skills, gender } = req.body;
    try {
      const normalizedGender = normalizeUserGender(gender);
      if (gender && !normalizedGender) {
        return res.status(400).json({ error: 'Invalid gender. Use MALE, FEMALE, or OTHER.' });
      }

      const salon = await prisma.salon.findUnique({ where: { id: req.params.id }, include: { services: true } });
      if (!salon) return res.status(404).json({ error: 'Salon not found' });

      const staff = await prisma.staff.create({ data: { name, skills, gender: normalizedGender, salonId: req.params.id } });

      const availabilityDays = [1, 2, 3, 4, 5, 6];
      await prisma.staffAvailability.createMany({
        data: availabilityDays.map(day => ({
          staffId: staff.id, dayOfWeek: day, startTime: salon.openTime, endTime: salon.closeTime,
        })),
      });

      if (salon.services.length > 0) {
        await prisma.staffService.createMany({
          data: salon.services.map(svc => ({ staffId: staff.id, serviceId: svc.id })),
        });
      }
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add staff' });
    }
  });

  // Admin: Delete staff from any salon
  app.delete('/api/admin/salons/:salonId/staff/:staffId', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const staff = await prisma.staff.findFirst({
        where: { id: req.params.staffId, salonId: req.params.salonId }
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });

      await prisma.$transaction(async (tx) => {
        await tx.staffAvailability.deleteMany({ where: { staffId: staff.id } });
        await tx.staffTimeOff.deleteMany({ where: { staffId: staff.id } });
        await tx.staffService.deleteMany({ where: { staffId: staff.id } });
        await tx.staff.update({
          where: { id: staff.id },
          data: { isActive: false },
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete staff (admin):', error);
      res.status(500).json({ error: 'Failed to delete staff' });
    }
  });

  // Booking quick-action (token-based, no login required)
  app.get('/api/bookings/action/:token', async (req: Request, res: Response) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { actionToken: req.params.token },
        include: {
          user: { select: { name: true, phone: true } },
          salon: { select: { name: true } },
          staff: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } }
        }
      });
      if (!booking) return res.status(404).json({ error: 'Booking not found or link expired' });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  app.post('/api/bookings/action/:token', async (req: Request, res: Response) => {
    const { action } = req.body;
    if (!['CONFIRMED', 'CANCELLED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use CONFIRMED or CANCELLED.' });
    }
    try {
      const booking = await prisma.booking.findUnique({
        where: { actionToken: req.params.token },
        include: { salon: true }
      });
      if (!booking) return res.status(404).json({ error: 'Booking not found or link expired' });
      if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
        return res.status(400).json({ error: `Cannot change status from ${booking.status}` });
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: action }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Health
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import('vite');
    const { default: react } = await import('@vitejs/plugin-react');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      configFile: false,
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPathFromModule = path.join(__dirname, 'dist');
    const distPathFromCwd = path.join(process.cwd(), 'dist');
    const distPath = fs.existsSync(distPathFromModule) ? distPathFromModule : distPathFromCwd;
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const PORT = 3000;
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer().catch(console.error);
}
