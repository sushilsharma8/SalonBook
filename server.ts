import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// --- Slot Generator ---
async function getAvailableSlots(prisma: PrismaClient, salonId: string, serviceIdsStr: string, date: string, staffId?: string) {
  const serviceIds = serviceIdsStr.split(',');
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
  });

  if (services.length !== serviceIds.length || services.length === 0) throw new Error("One or more services not found");

  const duration = services.reduce((acc, s) => acc + s.duration, 0);

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
    const availability = staff.availability.find(a => a.dayOfWeek === day);
    if (!availability) continue;

    let start = timeToMinutes(availability.startTime);
    let end = timeToMinutes(availability.endTime);

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
  const { staffId, startTime, duration, totalAmount, serviceIds } = data;

  const endTime = new Date(new Date(startTime).getTime() + duration * 60000);

  return await prisma.$transaction(async (tx) => {
    const fifteenMinsAgo = new Date(new Date().getTime() - 15 * 60000);

    const conflict = await tx.booking.findFirst({
      where: {
        staffId,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: new Date(startTime),
        },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", createdAt: { gt: fifteenMinsAgo } }
        ]
      },
    });

    if (conflict) {
      throw new Error("Slot already booked");
    }

    return tx.booking.create({
      data: {
        userId: data.userId,
        salonId: data.salonId,
        staffId: data.staffId,
        startTime: new Date(startTime),
        endTime,
        totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        services: {
          create: serviceIds.map((id: string) => ({
            service: { connect: { id } }
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
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, phone } = req.body;
      
      // Restrict roles during registration
      if (role && !['CUSTOMER', 'SELLER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: role || 'CUSTOMER', phone },
      });
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Middleware to check auth
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Salons
  app.get('/api/salons', async (req: Request, res: Response) => {
    try {
      const salons = await prisma.salon.findMany({
        include: { services: true, reviews: true }
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
          services: true, 
          staff: {
            include: { services: true }
          }, 
          reviews: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
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
        include: { services: true, staff: true }
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

  // Seller: Manage Services
  app.post('/api/seller/services', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, duration } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });
      
      const service = await prisma.service.create({
        data: { name, price: parseFloat(price), duration: parseInt(duration), salonId: salon.id }
      });
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add service' });
    }
  });

  // Seller: Manage Staff
  app.post('/api/seller/staff', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, skills } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });
      
      const staff = await prisma.staff.create({
        data: { name, skills, salonId: salon.id }
      });
      res.json(staff);
    } catch (error) {
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
      
      await prisma.staff.deleteMany({
        where: { id: req.params.id, salonId: salon.id }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete staff' });
    }
  });

  // Bookings
  app.get('/api/slots', async (req: Request, res: Response) => {
    try {
      const { salonId, serviceIds, date, staffId } = req.query;
      if (!salonId || !serviceIds || !date) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      const slots = await getAvailableSlots(prisma, String(salonId), String(serviceIds), String(date), staffId ? String(staffId) : undefined);
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

      const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
      if (services.length !== serviceIds.length) return res.status(404).json({ error: 'One or more services not found' });

      const totalDuration = services.reduce((acc, s) => acc + s.duration, 0);
      const totalPrice = services.reduce((acc, s) => acc + s.price, 0);

      const booking = await createBooking(prisma, {
        userId: req.user.userId,
        salonId,
        serviceIds,
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

  // Payments
  app.post('/api/payments/create-order', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Forbidden' });
    const { amount } = req.body;
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
      });

      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
      });
      res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (error: any) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.post('/api/payments/verify', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: 'Forbidden' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, amount } = req.body;
    try {
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret')
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expected === razorpay_signature) {
        // Payment verified, create payment record
        const payment = await prisma.payment.create({
          data: {
            bookingId,
            amount,
            fee: 0,
            status: 'SUCCESS',
            razorpayId: razorpay_payment_id
          }
        });
        
        // Update booking payment status
        await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' }
        });

        res.json({ success: true, payment });
      } else {
        res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Payment verification failed' });
    }
  });

  app.get('/api/bookings/my', requireAuth, async (req: Request, res: Response) => {
    try {
      const bookings = await prisma.booking.findMany({
        where: { userId: req.user.userId },
        include: { salon: true, services: { include: { service: true } }, staff: true },
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

      const updatedBooking = await prisma.booking.update({
        where: { id: req.params.id },
        data: { status }
      });
      res.json(updatedBooking);
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
      const { name, phone } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { name, phone }
      });
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
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
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
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

  // Health
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
