import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
  
  console.log("Date:", date, "Day:", day, "Staff count:", staffList.length);
  
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

async function main() {
  const salon = await prisma.salon.findFirst();
  const service = await prisma.service.findFirst({ where: { salonId: salon.id } });
  const staff = await prisma.staff.findFirst({ where: { salonId: salon.id } });
  
  console.log("Testing with:", salon.id, service.id, staff.id);
  const slots = await getAvailableSlots(prisma, salon.id, service.id, '2026-03-23', staff.id);
  console.log("Slots:", slots);
}
main();
