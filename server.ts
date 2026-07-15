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
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import ws from 'ws';
import posthog from './src/lib/posthog-server.js';
import { bookingTimeMs, isBookingUpcoming, nowBookingTimeMs } from './src/lib/bookingTime.js';
import {
  getSellerSubscriptionSummary,
  inviteClaimSellerSignupDefaults,
  manualSellerSignupDefaults,
} from './src/lib/sellerSubscription.js';
import { sendOwnerNotification } from './src/lib/ownerNotification.js';

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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'salon-images';
const SUPABASE_STORAGE_FOLDER = process.env.SUPABASE_STORAGE_FOLDER || 'salons';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MENU_MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
] as const;
const GOOGLE_MAPS_PLATFORM_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY;
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const APP_BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const SYSTEM_SELLER_EMAIL = 'system@salonbook.internal';

function getGeminiMenuModelChain(): string[] {
  const fromList = process.env.GEMINI_MENU_MODELS;
  if (fromList?.trim()) {
    const models = fromList.split(',').map((model) => model.trim()).filter(Boolean);
    if (models.length > 0) return models;
  }

  const preferred = process.env.GEMINI_MENU_MODEL?.trim();
  if (preferred) {
    const fallbacks = DEFAULT_GEMINI_MENU_MODEL_CHAIN.filter((model) => model !== preferred);
    return [preferred, ...fallbacks];
  }

  return [...DEFAULT_GEMINI_MENU_MODEL_CHAIN];
}

async function geocodeSalonAddress(
  address: string,
  name?: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_PLATFORM_KEY || !address?.trim()) return null;

  const query = name?.trim() ? `${name.trim()}, ${address.trim()}` : address.trim();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', GOOGLE_MAPS_PLATFORM_KEY);

  try {
    const response = await fetch(url);
    const data = await response.json();
    const location = data?.results?.[0]?.geometry?.location;
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (data?.status === 'OK' && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }

  return null;
}

function maskIndianPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `******${digits.slice(-4)}`;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return geminiClient;
}

type NormalizedServiceVariant = {
  targetGender: ServiceTargetGender;
  price: number;
  duration: number;
};

function normalizeAndValidateVariants(
  variants: unknown,
): { ok: true; variants: NormalizedServiceVariant[] } | { ok: false; error: string } {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { ok: false, error: 'At least one service variant is required' };
  }

  const normalizedVariants = variants.map((variant: any) => ({
    targetGender: String(variant.targetGender || '').toUpperCase(),
    price: Number(variant.price),
    duration: Number(variant.duration),
  }));

  const seenGenders = new Set<string>();
  for (const variant of normalizedVariants) {
    if (!['MALE', 'FEMALE', 'UNISEX'].includes(variant.targetGender)) {
      return { ok: false, error: 'Invalid variant gender. Use MALE, FEMALE, or UNISEX.' };
    }
    if (!Number.isFinite(variant.price) || variant.price <= 0 || !Number.isInteger(variant.price)) {
      return { ok: false, error: 'Variant price must be a positive whole number.' };
    }
    if (!Number.isFinite(variant.duration) || variant.duration <= 0 || !Number.isInteger(variant.duration)) {
      return { ok: false, error: 'Variant duration must be a positive whole number in minutes.' };
    }
    if (seenGenders.has(variant.targetGender)) {
      return { ok: false, error: 'Duplicate variant gender for one service is not allowed.' };
    }
    seenGenders.add(variant.targetGender);
  }

  return {
    ok: true,
    variants: normalizedVariants.map((variant) => ({
      targetGender: variant.targetGender as ServiceTargetGender,
      price: variant.price,
      duration: variant.duration,
    })),
  };
}

const MENU_EXTRACTION_PROMPT = `You are extracting salon service menu data from a rate-list or price menu photo.

Rules:
- Extract every distinct bookable service with its price(s).
- Prices must be whole-number rupees (no decimals, no currency symbols in output).
- If the menu shows one price for a service, use a single UNISEX variant.
- Only create separate MALE and FEMALE variants when the menu explicitly lists different prices for men and women.
- Estimate a reasonable service duration in minutes for each variant (typical salon services: haircut 30-45, color 60-90, facial 45-60, manicure 30-45, etc.).
- Ignore headers, footers, salon branding, addresses, phone numbers, and non-service text.
- Use clear, concise service names as they appear on the menu.
- Return JSON only, matching the provided schema.`;

const MENU_EXTRACTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    services: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          variants: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                targetGender: { type: 'STRING', enum: ['MALE', 'FEMALE', 'UNISEX'] },
                price: { type: 'INTEGER' },
                duration: { type: 'INTEGER' },
              },
              required: ['targetGender', 'price', 'duration'],
            },
          },
        },
        required: ['name', 'variants'],
      },
    },
  },
  required: ['services'],
} as const;

function sanitizeExtractedServices(raw: unknown): { name: string; variants: NormalizedServiceVariant[] }[] {
  const services = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { services?: unknown }).services)
      ? (raw as { services: unknown[] }).services
      : [];

  const cleaned: { name: string; variants: NormalizedServiceVariant[] }[] = [];

  for (const item of services) {
    if (!item || typeof item !== 'object') continue;
    const name = String((item as { name?: unknown }).name || '').trim();
    if (!name) continue;

    const validation = normalizeAndValidateVariants((item as { variants?: unknown }).variants);
    if (!validation.ok) continue;

    cleaned.push({ name, variants: validation.variants });
  }

  return cleaned;
}

const GEMINI_SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function normalizeMenuImageMimeType(mimeType: string, originalName?: string): string {
  const normalized = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (GEMINI_SUPPORTED_IMAGE_TYPES.has(normalized)) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  }

  const ext = path.extname(originalName || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';

  return normalized || 'application/octet-stream';
}

type GeminiExtractionError = {
  status: number;
  error: string;
  tryNextModel: boolean;
};

function parseGeminiExtractionError(error: unknown): GeminiExtractionError {
  const fallback: GeminiExtractionError = {
    status: 500,
    error: 'Failed to extract services from menu photo',
    tryNextModel: true,
  };
  if (!error || typeof error !== 'object') return fallback;

  let message = typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : fallback.error;
  let statusCode: number | string | undefined;
  let apiStatus: string | undefined;

  if (message.trim().startsWith('{')) {
    try {
      const nested = JSON.parse(message) as { error?: { code?: number | string; message?: string; status?: string } };
      const apiError = nested.error;
      if (apiError?.message) {
        message = apiError.message;
      }
      statusCode = apiError?.code;
      apiStatus = apiError?.status;
    } catch {
      // Keep the original message when nested JSON parsing fails.
    }
  }

  if (message.includes('Unsupported MIME type')) {
    return {
      status: 400,
      error: 'Unsupported image format. Use JPG or PNG. On iPhone, set Camera → Formats → Most Compatible.',
      tryNextModel: false,
    };
  }

  if (/API key not valid|invalid authentication|permission denied|PERMISSION_DENIED/i.test(message)) {
    return {
      status: 503,
      error: 'AI extraction is not configured correctly. Check GEMINI_API_KEY on the server.',
      tryNextModel: false,
    };
  }

  const isRateLimited =
    statusCode === 429 ||
    statusCode === 'RESOURCE_EXHAUSTED' ||
    apiStatus === 'RESOURCE_EXHAUSTED' ||
    /rate limit|quota exceeded|too many requests/i.test(message);

  const isUnavailable =
    statusCode === 503 ||
    statusCode === 'UNAVAILABLE' ||
    apiStatus === 'UNAVAILABLE' ||
    /high demand|try again later|UNAVAILABLE/i.test(message);

  const isModelMissing =
    statusCode === 404 ||
    statusCode === 'NOT_FOUND' ||
    apiStatus === 'NOT_FOUND' ||
    /model not found|is not supported|not available/i.test(message);

  if (isRateLimited || isUnavailable || isModelMissing) {
    return {
      status: 503,
      error: 'AI service is temporarily busy. Switching to another model...',
      tryNextModel: true,
    };
  }

  return { status: 500, error: message, tryNextModel: true };
}

async function generateMenuExtraction(
  ai: GoogleGenAI,
  model: string,
  mimeType: string,
  base64Data: string,
) {
  return ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: MENU_EXTRACTION_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: MENU_EXTRACTION_SCHEMA,
    },
  });
}

type MenuExtractionMeta = { model: string; inputTokens: number; outputTokens: number; latencyMs: number };

async function extractServicesWithModelFallback(
  ai: GoogleGenAI,
  mimeType: string,
  base64Data: string,
): Promise<
  | { ok: true; services: ReturnType<typeof sanitizeExtractedServices>; model: string; meta: MenuExtractionMeta }
  | { ok: false; status: number; error: string }
> {
  const models = getGeminiMenuModelChain();
  let lastError: GeminiExtractionError = {
    status: 503,
    error: 'AI service is temporarily busy. Please wait a few seconds and try again.',
    tryNextModel: false,
  };

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    const hasNextModel = index < models.length - 1;

    try {
      const callStart = Date.now();
      const response = await generateMenuExtraction(ai, model, mimeType, base64Data);
      const latencyMs = Date.now() - callStart;
      const rawText = response.text?.trim();
      if (!rawText) {
        lastError = {
          status: 502,
          error: 'AI returned an empty response. Try a clearer photo.',
          tryNextModel: hasNextModel,
        };
        if (hasNextModel) {
          console.warn(`Menu extraction with ${model} returned empty text; trying next model.`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        lastError = {
          status: 502,
          error: 'AI returned invalid JSON. Try again with a clearer photo.',
          tryNextModel: hasNextModel,
        };
        if (hasNextModel) {
          console.warn(`Menu extraction with ${model} returned invalid JSON; trying next model.`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }

      const services = sanitizeExtractedServices(parsed);
      if (services.length === 0) {
        lastError = {
          status: 422,
          error: 'No services could be extracted from this image. Try a clearer photo of your rate list.',
          tryNextModel: hasNextModel,
        };
        if (hasNextModel) {
          console.warn(`Menu extraction with ${model} found no services; trying next model.`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }

      const meta: MenuExtractionMeta = {
        model,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        latencyMs,
      };
      return { ok: true, services, model, meta };
    } catch (error) {
      const parsed = parseGeminiExtractionError(error);
      lastError = parsed;
      console.warn(`Menu extraction failed with ${model}:`, parsed.error);

      if (!parsed.tryNextModel || !hasNextModel) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return {
    ok: false,
    status: lastError.status,
    error: lastError.status === 503
      ? 'AI service is temporarily busy on all available models. Please wait a few seconds and try again.'
      : lastError.error,
  };
}

async function extractServicesFromMenuFile(
  file: Express.Multer.File,
): Promise<
  | { ok: true; services: ReturnType<typeof sanitizeExtractedServices>; meta: MenuExtractionMeta }
  | { ok: false; status: number; error: string }
> {
  const ai = getGeminiClient();
  if (!ai) {
    return { ok: false, status: 503, error: 'AI extraction is not configured. Set GEMINI_API_KEY on the server.' };
  }

  try {
    const fileBuffer = await fs.promises.readFile(file.path);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = normalizeMenuImageMimeType(file.mimetype, file.originalname);

    if (!GEMINI_SUPPORTED_IMAGE_TYPES.has(mimeType)) {
      return {
        ok: false,
        status: 400,
        error: 'Unsupported image format. Use JPG or PNG. On iPhone, set Camera → Formats → Most Compatible.',
      };
    }

    const result = await extractServicesWithModelFallback(ai, mimeType, base64Data);
    if (result.ok === false) {
      return { ok: false, status: result.status, error: result.error };
    }

    return { ok: true, services: result.services, meta: result.meta };
  } catch (error: any) {
    console.error('Menu extraction failed:', error);
    const parsed = parseGeminiExtractionError(error);
    return { ok: false, status: parsed.status, error: parsed.error };
  } finally {
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // Best-effort cleanup for temporary local upload files.
      }
    }
  }
}

async function bulkImportServicesForSalon(
  salonId: string,
  services: unknown,
): Promise<
  | { ok: true; created: any[]; skipped: string[] }
  | { ok: false; status: number; error: string }
> {
  if (!Array.isArray(services) || services.length === 0) {
    return { ok: false, status: 400, error: 'At least one service is required' };
  }

  const existingServices = await prisma.service.findMany({
    where: { salonId },
    select: { name: true },
  });
  const existingNames = new Set(existingServices.map((svc) => svc.name.trim().toLowerCase()));
  const salonStaff = await prisma.staff.findMany({ where: { salonId }, select: { id: true } });
  const created: any[] = [];
  const skipped: string[] = [];

  for (const item of services) {
    const name = String((item as { name?: unknown })?.name || '').trim();
    if (!name) {
      return { ok: false, status: 400, error: 'Each service must have a name' };
    }

    if (existingNames.has(name.toLowerCase())) {
      skipped.push(name);
      continue;
    }

    const variantValidation = normalizeAndValidateVariants((item as { variants?: unknown })?.variants);
    if (variantValidation.ok === false) {
      return { ok: false, status: 400, error: `${name}: ${variantValidation.error}` };
    }

    const normalizedVariants = variantValidation.variants;
    const baseVariant = normalizedVariants[0];

    const service = await prisma.service.create({
      data: {
        name,
        salonId,
        price: baseVariant.price,
        duration: baseVariant.duration,
        variants: {
          create: normalizedVariants.map((variant) => ({
            targetGender: variant.targetGender,
            price: variant.price,
            duration: variant.duration,
          })),
        },
      },
      include: { variants: true },
    });

    if (salonStaff.length > 0) {
      await prisma.staffService.createMany({
        data: salonStaff.map((staff) => ({ staffId: staff.id, serviceId: service.id })),
        skipDuplicates: true,
      });
    }

    existingNames.add(name.toLowerCase());
    created.push(service);
  }

  return { ok: true, created, skipped };
}

function getSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      realtime: { transport: ws as unknown as typeof WebSocket },
    });
  }
  return supabaseAdminClient;
}

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

/** Hidden staff row used when a salon has no manually added team members. */
const SALON_DEFAULT_STAFF_SKILLS = '__SALON_DEFAULT__';

async function ensureSalonDefaultStaff(prismaClient: PrismaClient, salonId: string) {
  const salon = await prismaClient.salon.findUnique({
    where: { id: salonId },
    include: { services: { select: { id: true } } },
  });
  if (!salon) throw new Error('Salon not found');

  let staff = await prismaClient.staff.findFirst({
    where: { salonId, skills: SALON_DEFAULT_STAFF_SKILLS },
  });

  if (!staff) {
    staff = await prismaClient.staff.create({
      data: {
        salonId,
        name: 'Any stylist',
        skills: SALON_DEFAULT_STAFF_SKILLS,
        isActive: true,
      },
    });
  } else if (!staff.isActive) {
    staff = await prismaClient.staff.update({
      where: { id: staff.id },
      data: { isActive: true },
    });
  }

  await syncStaffAvailabilityFromSalonHours(prismaClient, salonId, staff!.id);

  if (salon.services.length > 0) {
    await prismaClient.staffService.createMany({
      data: salon.services.map((svc) => ({ staffId: staff!.id, serviceId: svc.id })),
      skipDuplicates: true,
    });
  }

  return staff;
}

async function deactivateSalonDefaultStaff(prismaClient: PrismaClient, salonId: string) {
  await prismaClient.staff.updateMany({
    where: { salonId, skills: SALON_DEFAULT_STAFF_SKILLS, isActive: true },
    data: { isActive: false },
  });
}

async function salonHasRealStaff(prismaClient: PrismaClient, salonId: string) {
  const count = await prismaClient.staff.count({
    where: {
      salonId,
      isActive: true,
      NOT: { skills: SALON_DEFAULT_STAFF_SKILLS },
    },
  });
  return count > 0;
}

type SalonDayHoursRow = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

function buildDefaultWeeklyHours(openTime: string, closeTime: string): SalonDayHoursRow[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
    startTime: openTime,
    endTime: closeTime,
  }));
}

function parseWeeklyHoursInput(
  raw: unknown,
  openTime: string,
  closeTime: string
): SalonDayHoursRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildDefaultWeeklyHours(openTime, closeTime);
  }

  const byDay = new Map<number, SalonDayHoursRow>();
  for (const entry of raw) {
    const dayOfWeek = Number((entry as { dayOfWeek?: unknown }).dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
    const isOpen = Boolean((entry as { isOpen?: unknown }).isOpen);
    const startTime = String((entry as { startTime?: unknown }).startTime || openTime);
    const endTime = String((entry as { endTime?: unknown }).endTime || closeTime);
    byDay.set(dayOfWeek, { dayOfWeek, isOpen, startTime, endTime });
  }

  return [0, 1, 2, 3, 4, 5, 6].map(
    (dayOfWeek) =>
      byDay.get(dayOfWeek) ?? { dayOfWeek, isOpen: true, startTime: openTime, endTime: closeTime }
  );
}

function validateWeeklyHours(hours: SalonDayHoursRow[]) {
  const openDays = hours.filter((h) => h.isOpen);
  if (openDays.length === 0) {
    throw new Error('Salon must be open on at least one day of the week');
  }
  for (const day of openDays) {
    const start = timeToMinutes(day.startTime);
    const end = timeToMinutes(day.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      throw new Error(`Invalid hours for day ${day.dayOfWeek}`);
    }
  }
}

function weeklyHoursFromSalonRecord(salon: {
  openTime: string;
  closeTime: string;
  hours: Array<{ dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string }>;
}): SalonDayHoursRow[] {
  if (salon.hours.length === 0) {
    return buildDefaultWeeklyHours(salon.openTime, salon.closeTime);
  }
  return salon.hours.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    isOpen: r.isOpen,
    startTime: r.startTime,
    endTime: r.endTime,
  }));
}

async function getSalonWeeklyHours(prismaClient: PrismaClient, salonId: string): Promise<SalonDayHoursRow[]> {
  const salon = await prismaClient.salon.findUnique({
    where: { id: salonId },
    select: {
      openTime: true,
      closeTime: true,
      hours: { orderBy: { dayOfWeek: 'asc' } },
    },
  });
  if (!salon) throw new Error('Salon not found');
  return weeklyHoursFromSalonRecord(salon);
}

function dayUtcBounds(date: string) {
  const [year, month, d] = date.split('-').map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, d));
  const dayEnd = new Date(Date.UTC(year, month - 1, d + 1));
  return { dayStart, dayEnd, day: dayStart.getUTCDay() };
}

type StaleBookingScope = { salonId?: string; userId?: string; bookingId?: string };

/** Auto-cancel PENDING bookings whose appointment time has passed. */
async function expireStalePendingBookings(
  prismaClient: PrismaClient,
  scope: StaleBookingScope = {},
) {
  const pending = await prismaClient.booking.findMany({
    where: {
      status: 'PENDING',
      ...(scope.salonId ? { salonId: scope.salonId } : {}),
      ...(scope.userId ? { userId: scope.userId } : {}),
      ...(scope.bookingId ? { id: scope.bookingId } : {}),
    },
    select: { id: true, startTime: true },
  });

  const nowMs = nowBookingTimeMs();
  const expiredIds = pending
    .filter((booking) => bookingTimeMs(booking.startTime) <= nowMs)
    .map((booking) => booking.id);

  if (expiredIds.length === 0) return 0;

  await prismaClient.booking.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: 'CANCELLED' },
  });

  return expiredIds.length;
}

function activeBookingsWhereForDay(dayStart: Date, dayEnd: Date) {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
  return {
    startTime: { gte: dayStart, lt: dayEnd },
    status: { not: 'CANCELLED' as const },
    OR: [
      { status: { not: 'PENDING' as const } },
      { status: 'PENDING' as const, createdAt: { gte: fifteenMinsAgo } },
    ],
  };
}

function staffSlotInclude(dayStart: Date, dayEnd: Date) {
  return {
    availability: true,
    timeOff: {
      where: { date: { gte: dayStart, lt: dayEnd } },
    },
    bookings: {
      where: activeBookingsWhereForDay(dayStart, dayEnd),
      select: { startTime: true, endTime: true },
    },
  };
}

async function saveSalonWeeklyHours(
  prismaClient: PrismaClient,
  salonId: string,
  hours: SalonDayHoursRow[]
) {
  validateWeeklyHours(hours);
  await prismaClient.$transaction(
    hours.map((day) =>
      prismaClient.salonHours.upsert({
        where: { salonId_dayOfWeek: { salonId, dayOfWeek: day.dayOfWeek } },
        create: {
          salonId,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          startTime: day.startTime,
          endTime: day.endTime,
        },
        update: {
          isOpen: day.isOpen,
          startTime: day.startTime,
          endTime: day.endTime,
        },
      })
    )
  );
}

async function syncStaffAvailabilityFromSalonHours(
  prismaClient: PrismaClient,
  salonId: string,
  staffId?: string
) {
  const hours = await getSalonWeeklyHours(prismaClient, salonId);
  const openHours = hours.filter((h) => h.isOpen);
  const staffList = await prismaClient.staff.findMany({
    where: {
      salonId,
      isActive: true,
      ...(staffId ? { id: staffId } : {}),
    },
  });

  for (const staff of staffList) {
    await prismaClient.staffAvailability.deleteMany({ where: { staffId: staff.id } });
    if (openHours.length > 0) {
      await prismaClient.staffAvailability.createMany({
        data: openHours.map((h) => ({
          staffId: staff.id,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      });
    }
  }
}

function getDayHoursFromWeekly(hours: SalonDayHoursRow[], day: number, legacyDay: number) {
  return (
    hours.find((h) => h.dayOfWeek === day && h.isOpen) ??
    hours.find((h) => h.dayOfWeek === legacyDay && h.isOpen) ??
    null
  );
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
async function findStaffForSlots(
  prisma: PrismaClient,
  salonId: string,
  serviceIds: string[],
  dayStart: Date,
  dayEnd: Date,
  staffId?: string,
  useRealStaffOnly?: boolean
) {
  const staffWhere = {
    salonId,
    isActive: true,
    ...(staffId ? { id: staffId } : {}),
    ...(useRealStaffOnly ? { NOT: { skills: SALON_DEFAULT_STAFF_SKILLS } } : {}),
    AND: serviceIds.map((id) => ({
      services: { some: { serviceId: id } },
    })),
  };

  return prisma.staff.findMany({
    where: staffWhere,
    include: staffSlotInclude(dayStart, dayEnd),
  });
}

async function getAvailableSlots(
  prisma: PrismaClient,
  salonId: string,
  serviceIdsStr: string,
  date: string,
  userGender: UserGender,
  staffId?: string
) {
  const serviceIds = serviceIdsStr.split(',');
  const { dayStart, dayEnd, day } = dayUtcBounds(date);

  const [services, salonRecord, hasRealStaff] = await Promise.all([
    resolveServiceVariantsForUser(prisma, serviceIds, userGender),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        openTime: true,
        closeTime: true,
        hours: { orderBy: { dayOfWeek: 'asc' } },
      },
    }),
    staffId ? Promise.resolve(false) : salonHasRealStaff(prisma, salonId),
  ]);

  if (!salonRecord) {
    throw new Error('Salon not found');
  }

  const duration = services.reduce((acc, s) => acc + s.duration, 0);
  const salonWeeklyHours = weeklyHoursFromSalonRecord(salonRecord);
  const useRealStaffOnly = !staffId && hasRealStaff;

  let staffList = await findStaffForSlots(
    prisma,
    salonId,
    serviceIds,
    dayStart,
    dayEnd,
    staffId,
    useRealStaffOnly
  );

  if (staffList.length === 0 && !staffId) {
    await ensureSalonDefaultStaff(prisma, salonId);
    staffList = await prisma.staff.findMany({
      where: {
        salonId,
        isActive: true,
        skills: SALON_DEFAULT_STAFF_SKILLS,
        AND: serviceIds.map((id) => ({
          services: { some: { serviceId: id } },
        })),
      },
      include: staffSlotInclude(dayStart, dayEnd),
    });
  }

  let slotMap = new Map<string, boolean>();

  for (const staff of staffList) {
    // Support both 0-6 (Sun-Sat) and 1-7 (Mon-Sun) encodings in existing DBs.
    const legacyDay = day === 0 ? 7 : day;
    const salonDayHours = getDayHoursFromWeekly(salonWeeklyHours, day, legacyDay);
    if (!salonDayHours) continue;

    const staffDayAvailability =
      staff.availability.find((a) => a.dayOfWeek === day) ??
      staff.availability.find((a) => a.dayOfWeek === legacyDay);

    const availability = staffDayAvailability
      ? {
          startTime: staffDayAvailability.startTime,
          endTime: staffDayAvailability.endTime,
        }
      : staff.availability.length === 0
        ? { startTime: salonDayHours.startTime, endTime: salonDayHours.endTime }
        : undefined;
    if (!availability) continue;

    let start = timeToMinutes(availability.startTime);
    let end = timeToMinutes(availability.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;

    while (start + duration <= end) {
      const slotEnd = start + duration;

      const conflict = staff.bookings.some((b) => {
        const bStart = new Date(b.startTime).getUTCHours() * 60 + new Date(b.startTime).getUTCMinutes();
        const bEnd = new Date(b.endTime).getUTCHours() * 60 + new Date(b.endTime).getUTCMinutes();
        return isOverlapping(start, slotEnd, bStart, bEnd);
      });

      const timeOffConflict = (staff.timeOff || []).some((off) => {
        const offStart = timeToMinutes(off.startTime);
        const offEnd = timeToMinutes(off.endTime);
        return isOverlapping(start, slotEnd, offStart, offEnd);
      });

      const timeStr = minutesToTime(start);
      if (!conflict && !timeOffConflict) {
        slotMap.set(timeStr, true);
      } else if (!slotMap.has(timeStr)) {
        slotMap.set(timeStr, false);
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

      const hasRealStaff = await salonHasRealStaff(tx as unknown as PrismaClient, salonId);
      const candidates = await tx.staff.findMany({
        where: {
          salonId,
          isActive: true,
          ...(hasRealStaff ? { NOT: { skills: SALON_DEFAULT_STAFF_SKILLS } } : {}),
          AND: serviceIds.map((id) => ({
            services: { some: { serviceId: id } },
          })),
        },
        include: { availability: true },
      });

      const legacyDay = day === 0 ? 7 : day;
      for (const candidate of candidates) {
        const availability =
          candidate.availability.find((a) => a.dayOfWeek === day) ??
          candidate.availability.find((a) => a.dayOfWeek === legacyDay);
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

      const defaultStaff = await ensureSalonDefaultStaff(tx as unknown as PrismaClient, salonId);
      const defaultAvailability = await tx.staffAvailability.findMany({
        where: { staffId: defaultStaff.id },
      });
      const availability =
        defaultAvailability.find((a) => a.dayOfWeek === day) ??
        defaultAvailability.find((a) => a.dayOfWeek === legacyDay);
      if (availability) {
        const availStart = timeToMinutes(availability.startTime);
        const availEnd = timeToMinutes(availability.endTime);
        if (startMinutes < availStart || endMinutes > availEnd) {
          throw new Error('Selected time is outside salon hours');
        }
      }

      const defaultConflict = await tx.booking.findFirst({
        where: {
          staffId: defaultStaff.id,
          startTime: { lt: endTime },
          endTime: { gt: startDate },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', createdAt: { gt: fifteenMinsAgo } },
          ],
        },
      });
      if (defaultConflict) {
        throw new Error('Slot already booked');
      }

      return defaultStaff.id;
    };

    const resolvedStaffId = await resolveStaffId();

    // Stale checkout holds (>15 min) are ignored when computing conflicts and slots, but rows
    // still exist — @@unique([staffId, startTime]) would fail without releasing them here.
    await tx.booking.updateMany({
      where: {
        staffId: resolvedStaffId,
        status: 'PENDING',
        createdAt: { lte: fifteenMinsAgo },
        startTime: { lt: endTime },
        endTime: { gt: startDate },
      },
      data: { status: 'CANCELLED' },
    });

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

    const dayStart = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
    );
    const timeOffEntries = await tx.staffTimeOff.findMany({
      where: { staffId: resolvedStaffId, date: dayStart },
    });
    const blockedByTimeOff = timeOffEntries.some((off) =>
      isOverlapping(
        startMinutes,
        endMinutes,
        timeToMinutes(off.startTime),
        timeToMinutes(off.endTime),
      ),
    );
    if (blockedByTimeOff) {
      throw new Error('Selected professional is not available at this time');
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
        status: 'PENDING',
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

const IMAGE_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']);

function imageUploadFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (
    mime.startsWith('image/') ||
    mime === 'application/octet-stream' ||
    IMAGE_UPLOAD_EXTENSIONS.has(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
}

export async function createApp() {
  const app = express();
  // Serverless runtimes (e.g. Vercel) expose a read-only app directory.
  // Use /tmp for runtime uploads so multipart requests do not fail with EROFS.
  const uploadsRoot = process.env.VERCEL === '1'
    ? path.join('/tmp', 'uploads')
    : path.join(process.cwd(), 'uploads');
  const salonUploadsDir = path.join(uploadsRoot, 'salons');
  const avatarUploadsDir = path.join(uploadsRoot, 'avatars');

  if (!fs.existsSync(salonUploadsDir)) {
    fs.mkdirSync(salonUploadsDir, { recursive: true });
  }
  if (!fs.existsSync(avatarUploadsDir)) {
    fs.mkdirSync(avatarUploadsDir, { recursive: true });
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
    fileFilter: imageUploadFileFilter,
  });

  const userAvatarUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, avatarUploadsDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: imageUploadFileFilter,
  });
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
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
      const sellerDefaults =
        normalizedRole === 'SELLER'
          ? manualSellerSignupDefaults()
          : {};
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: normalizedRole,
          phone,
          gender: normalizedRole === 'CUSTOMER' ? (normalizedGender as UserGender | undefined) ?? null : null,
          ...sellerDefaults,
        },
      });
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
      const anonId = req.headers['x-posthog-distinct-id'] as string | undefined;
      posthog.identify({
        distinctId: user.id,
        properties: {
          $set: { name: user.name, email: user.email, role: user.role, phone: user.phone },
          $set_once: { created_at: user.createdAt?.toISOString() },
          ...(anonId ? { $anon_distinct_id: anonId } : {}),
        },
      });
      posthog.capture({
        distinctId: user.id,
        event: 'user_registered',
        properties: {
          role: user.role,
          gender: user.gender,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          gender: user.gender,
          avatarUrl: user.avatarUrl,
          sellerSubscription: getSellerSubscriptionSummary(user),
        },
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
      const anonId = req.headers['x-posthog-distinct-id'] as string | undefined;
      posthog.identify({
        distinctId: user.id,
        properties: {
          $set: { name: user.name, email: user.email, role: user.role, phone: user.phone },
          ...(anonId ? { $anon_distinct_id: anonId } : {}),
        },
      });
      posthog.capture({
        distinctId: user.id,
        event: 'user_logged_in',
        properties: {
          role: user.role,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          gender: user.gender,
          avatarUrl: user.avatarUrl,
          sellerSubscription: getSellerSubscriptionSummary(user),
        },
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

  app.get('/api/claim/:token', async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token || '').trim();
      if (!token) return res.status(400).json({ error: 'Invalid claim token' });
      const salon = await prisma.salon.findFirst({
        where: { claimToken: token },
        select: { id: true, name: true, address: true, claimedAt: true, listedPhone: true },
      });
      if (!salon) return res.status(404).json({ error: 'Claim link not found or expired' });
      if (salon.claimedAt) return res.status(410).json({ error: 'This salon is already claimed' });
      return res.json({
        salon: {
          id: salon.id,
          name: salon.name,
          address: salon.address,
          listedPhoneMasked: maskIndianPhone(salon.listedPhone),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load claim link' });
    }
  });

  app.post('/api/claim/:token', async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token || '').trim();
      const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
      if (!token) return res.status(400).json({ error: 'Invalid claim token' });
      if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ error: 'Enter a valid email address' });
      if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const existing = await prisma.user.findUnique({ where: { email: String(email).trim() } });
      if (existing) return res.status(400).json({ error: 'Email already in use. Please use a different email for claim.' });

      const result = await prisma.$transaction(async (tx) => {
        const salon = await tx.salon.findFirst({
          where: { claimToken: token },
          select: { id: true, name: true, listedPhone: true, claimedAt: true },
        });
        if (!salon) throw new Error('CLAIM_NOT_FOUND');
        if (salon.claimedAt) throw new Error('CLAIM_ALREADY_USED');

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await tx.user.create({
          data: {
            name: String(name).trim(),
            email: String(email).trim(),
            phone: salon.listedPhone || null,
            password: hashedPassword,
            role: 'SELLER',
            ...inviteClaimSellerSignupDefaults(),
          },
        });

        await tx.salon.update({
          where: { id: salon.id },
          data: {
            ownerId: user.id,
            claimedAt: new Date(),
            claimToken: null,
          },
        });

        return user;
      });

      const jwtToken = jwt.sign({ userId: result.id, role: result.role }, JWT_SECRET);
      return res.json({
        token: jwtToken,
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
          phone: result.phone,
          gender: result.gender,
          avatarUrl: result.avatarUrl,
          sellerSubscription: getSellerSubscriptionSummary(result),
        },
      });
    } catch (error: any) {
      if (error?.message === 'CLAIM_NOT_FOUND') return res.status(404).json({ error: 'Claim link not found or expired' });
      if (error?.message === 'CLAIM_ALREADY_USED') return res.status(410).json({ error: 'This salon is already claimed' });
      console.error(error);
      return res.status(500).json({ error: 'Claim failed' });
    }
  });

  // Salons
  let salonsListCache: { data: unknown[]; expiresAt: number; cacheKey: string } | null = null;
  const SALONS_LIST_TTL_MS = 30_000;
  const invalidateSalonsListCache = () => {
    salonsListCache = null;
  };

  const getOrCreateSystemSeller = async () => {
    const existing = await prisma.user.findUnique({ where: { email: SYSTEM_SELLER_EMAIL } });
    if (existing) return existing;
    const password = await bcrypt.hash(crypto.randomUUID(), 10);
    return prisma.user.create({
      data: {
        name: 'SalonBook System',
        email: SYSTEM_SELLER_EMAIL,
        phone: null,
        password,
        role: 'SELLER',
        ...manualSellerSignupDefaults(),
      },
    });
  };

  app.get('/api/salons', async (req: Request, res: Response) => {
    try {
      if (salonsListCache && Date.now() < salonsListCache.expiresAt) {
        return res.json(salonsListCache.data);
      }

      const rows = await prisma.salon.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          images: true,
          categories: true,
          openTime: true,
          closeTime: true,
          featured: true,
          hours: {
            select: { dayOfWeek: true, isOpen: true, startTime: true, endTime: true },
            orderBy: { dayOfWeek: 'asc' },
          },
          _count: { select: { services: true, reviews: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: [{ featured: 'desc' }, { bookings: { _count: 'desc' } }],
      });

      const salons = rows.map(({ reviews, _count, ...salon }) => {
        const reviewCount = _count.reviews;
        const avgRating =
          reviewCount > 0
            ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
            : null;
        return {
          ...salon,
          serviceCount: _count.services,
          reviewCount,
          avgRating,
        };
      });

      salonsListCache = { data: salons, expiresAt: Date.now() + SALONS_LIST_TTL_MS, cacheKey: 'all' };
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
          hours: { orderBy: { dayOfWeek: 'asc' } },
          staff: {
            where: { isActive: true, NOT: { skills: SALON_DEFAULT_STAFF_SKILLS } },
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
        include: {
          services: { include: { variants: true } },
          hours: { orderBy: { dayOfWeek: 'asc' } },
          staff: {
            where: { isActive: true, NOT: { skills: SALON_DEFAULT_STAFF_SKILLS } },
            include: {
              timeOff: { orderBy: { date: 'asc' } },
            },
          }
        }
      });
      res.json(salon || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch salon' });
    }
  });

  app.get('/api/seller/subscription', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(getSellerSubscriptionSummary(user));
    } catch {
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Seller: Create/Update Salon
  app.post('/api/seller/salon', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, address, categories, images, openTime, closeTime, weeklyHours } = req.body;
    
    try {
      const hoursPayload = parseWeeklyHoursInput(weeklyHours, openTime, closeTime);
      validateWeeklyHours(hoursPayload);

      const coords = await geocodeSalonAddress(address, name);

      let salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      const isNewSalon = !salon;
      const salonData = {
        name,
        address,
        categories,
        images,
        openTime,
        closeTime,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };
      if (salon) {
        salon = await prisma.salon.update({
          where: { id: salon.id },
          data: salonData,
        });
      } else {
        salon = await prisma.salon.create({
          data: { ...salonData, ownerId: req.user.userId },
        });
      }

      await saveSalonWeeklyHours(prisma, salon.id, hoursPayload);
      await syncStaffAvailabilityFromSalonHours(prisma, salon.id);
      if (!(await salonHasRealStaff(prisma, salon.id))) {
        await ensureSalonDefaultStaff(prisma, salon.id);
      }

      const salonWithHours = await prisma.salon.findUnique({
        where: { id: salon.id },
        include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
      });
      posthog.capture({
        distinctId: req.user.userId,
        event: isNewSalon ? 'salon_created' : 'salon_updated',
        properties: {
          salon_id: salon.id,
          salon_name: name,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      invalidateSalonsListCache();
      res.json(salonWithHours);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save salon' });
    }
  });

  app.post('/api/seller/upload-images', requireAuth, (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });

    salonImageUpload.array('images', 20)(req, res, async (err) => {
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

      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        const urls: string[] = [];

        try {
          for (const file of files) {
            const ext = path.extname(file.originalname) || path.extname(file.filename) || '.jpg';
            const objectPath = `${SUPABASE_STORAGE_FOLDER}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const fileBuffer = await fs.promises.readFile(file.path);

            const { error: uploadError } = await supabaseAdmin.storage
              .from(SUPABASE_STORAGE_BUCKET)
              .upload(objectPath, fileBuffer, {
                contentType: file.mimetype || 'application/octet-stream',
                upsert: false,
              });

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            const { data } = supabaseAdmin.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
            urls.push(data.publicUrl);
          }

          return res.json({ urls });
        } catch (uploadError: any) {
          return res.status(500).json({ error: uploadError?.message || 'Failed to upload images to Supabase Storage' });
        } finally {
          await Promise.all(
            files.map(async (file) => {
              if (!file.path) return;
              try {
                await fs.promises.unlink(file.path);
              } catch {
                // Best-effort cleanup for temporary local upload files.
              }
            })
          );
        }
      }

      const urls = files.map((file) => `/uploads/salons/${file.filename}`);
      return res.json({ urls });
    });
  });

  const handleMenuImageUpload = (req: Request, res: Response, onFile: (file: Express.Multer.File) => Promise<void>) => {
    salonImageUpload.single('image')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Image must be 15MB or smaller' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      try {
        await onFile(file);
      } catch (error) {
        console.error('Menu image upload handler failed:', error);
        if (!res.headersSent) {
          const parsed = parseGeminiExtractionError(error);
          res.status(parsed.status).json({ error: parsed.error });
        }
      }
    });
  };

  app.post('/api/seller/services/extract-from-menu', requireAuth, (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });

    handleMenuImageUpload(req, res, async (file) => {
      const result = await extractServicesFromMenuFile(file);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      const traceId = crypto.randomUUID();
      posthog.capture({
        distinctId: req.user.userId,
        event: '$ai_generation',
        properties: {
          $ai_trace_id: traceId,
          $ai_model: result.meta.model,
          $ai_provider: 'google',
          $ai_input_tokens: result.meta.inputTokens,
          $ai_output_tokens: result.meta.outputTokens,
          $ai_latency: result.meta.latencyMs / 1000,
          $ai_span_name: 'menu_extraction',
          $ai_is_error: false,
        },
      });
      posthog.capture({
        distinctId: req.user.userId,
        event: 'menu_scan_completed',
        properties: {
          services_found: result.services.length,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      res.json({ services: result.services });
    });
  });

  app.post('/api/seller/services', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, variants } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const variantValidation = normalizeAndValidateVariants(variants);
      if (variantValidation.ok === false) {
        return res.status(400).json({ error: variantValidation.error });
      }
      const normalizedVariants = variantValidation.variants;

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
              targetGender: variant.targetGender,
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

      posthog.capture({
        distinctId: req.user.userId,
        event: 'service_added',
        properties: {
          service_id: service.id,
          service_name: service.name,
          salon_id: salon.id,
          variant_count: normalizedVariants.length,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      invalidateSalonsListCache();
      res.json(service);
    } catch (error: any) {
      console.error('Failed to add service:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Failed to add service';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/seller/services/:id', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { name, variants } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const existing = await prisma.service.findFirst({
        where: { id: req.params.id, salonId: salon.id },
      });
      if (!existing) return res.status(404).json({ error: 'Service not found' });

      const variantValidation = normalizeAndValidateVariants(variants);
      if (variantValidation.ok === false) {
        return res.status(400).json({ error: variantValidation.error });
      }
      const normalizedVariants = variantValidation.variants;
      const baseVariant = normalizedVariants[0];

      const service = await prisma.$transaction(async (tx) => {
        await tx.service.update({
          where: { id: existing.id },
          data: {
            name: String(name || existing.name).trim(),
            price: baseVariant.price,
            duration: baseVariant.duration,
          },
        });

        for (const variant of normalizedVariants) {
          await tx.serviceVariant.upsert({
            where: {
              serviceId_targetGender: {
                serviceId: existing.id,
                targetGender: variant.targetGender,
              },
            },
            create: {
              serviceId: existing.id,
              targetGender: variant.targetGender,
              price: variant.price,
              duration: variant.duration,
            },
            update: {
              price: variant.price,
              duration: variant.duration,
            },
          });
        }

        const keepGenders = normalizedVariants.map((variant) => variant.targetGender);
        await tx.serviceVariant.deleteMany({
          where: {
            serviceId: existing.id,
            targetGender: { notIn: keepGenders },
          },
        });

        return tx.service.findUnique({
          where: { id: existing.id },
          include: { variants: true },
        });
      });

      invalidateSalonsListCache();
      res.json(service);
    } catch (error: any) {
      console.error('Failed to update service:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Failed to update service';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/seller/services/bulk', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });

    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const result = await bulkImportServicesForSalon(salon.id, req.body.services);
      if (result.ok === false) {
        return res.status(result.status).json({ error: result.error });
      }

      if (result.created.length > 0) {
        invalidateSalonsListCache();
      }

      res.json({ created: result.created, skipped: result.skipped });
    } catch (error: any) {
      console.error('Failed to bulk import services:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Failed to import services';
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

      await syncStaffAvailabilityFromSalonHours(prisma, salon.id, staff.id);

      // Auto-link staff to all existing salon services
      if (salon.services.length > 0) {
        await prisma.staffService.createMany({
          data: salon.services.map(svc => ({
            staffId: staff.id,
            serviceId: svc.id,
          })),
        });
      }

      await deactivateSalonDefaultStaff(prisma, salon.id);

      posthog.capture({
        distinctId: req.user.userId,
        event: 'staff_added',
        properties: {
          staff_id: staff.id,
          salon_id: salon.id,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
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
      posthog.capture({
        distinctId: req.user.userId,
        event: 'service_deleted',
        properties: {
          service_id: req.params.id,
          salon_id: salon.id,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      invalidateSalonsListCache();
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

      if (!(await salonHasRealStaff(prisma, salon.id))) {
        await ensureSalonDefaultStaff(prisma, salon.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete staff:', error);
      res.status(500).json({ error: 'Failed to delete staff' });
    }
  });

  app.get('/api/seller/staff/:id/time-off', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const staff = await prisma.staff.findFirst({
        where: { id: req.params.id, salonId: salon.id, isActive: true },
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });

      const timeOff = await prisma.staffTimeOff.findMany({
        where: { staffId: staff.id },
        orderBy: { date: 'asc' },
      });
      res.json(timeOff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch time off' });
    }
  });

  app.post('/api/seller/staff/:id/time-off', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    const { date, startTime, endTime, allDay } = req.body;
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const staff = await prisma.staff.findFirst({
        where: { id: req.params.id, salonId: salon.id, isActive: true },
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });

      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Date is required (YYYY-MM-DD).' });
      }

      const dayStart = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(dayStart.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const resolvedStart = allDay ? '00:00' : String(startTime || '09:00');
      const resolvedEnd = allDay ? '23:59' : String(endTime || '18:00');
      if (timeToMinutes(resolvedStart) >= timeToMinutes(resolvedEnd)) {
        return res.status(400).json({ error: 'End time must be after start time.' });
      }

      const entry = await prisma.staffTimeOff.create({
        data: {
          staffId: staff.id,
          date: dayStart,
          startTime: resolvedStart,
          endTime: resolvedEnd,
        },
      });
      res.json(entry);
    } catch (error) {
      console.error('Failed to add staff time off:', error);
      res.status(500).json({ error: 'Failed to add time off' });
    }
  });

  app.delete('/api/seller/staff/:id/time-off/:timeOffId', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'SELLER') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId } });
      if (!salon) return res.status(400).json({ error: 'Create salon first' });

      const staff = await prisma.staff.findFirst({
        where: { id: req.params.id, salonId: salon.id },
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });

      const deleted = await prisma.staffTimeOff.deleteMany({
        where: { id: req.params.timeOffId, staffId: staff.id },
      });
      if (deleted.count === 0) return res.status(404).json({ error: 'Time off not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete time off' });
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

      const bookedSalon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { name: true, listedPhone: true, claimToken: true, claimedAt: true },
      });
      if (bookedSalon && !bookedSalon.claimedAt) {
        const bookingDateLabel = new Date(time).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        void sendOwnerNotification({
          whatsappApiUrl: WHATSAPP_API_URL,
          appBaseUrl: APP_BASE_URL,
          salonName: bookedSalon.name,
          listedPhone: bookedSalon.listedPhone,
          claimToken: bookedSalon.claimToken,
          bookingDateLabel,
          serviceNames: resolvedServices.map((service) => service.serviceName),
        }).catch((notifyError) => {
          console.error('Owner notification failed:', notifyError);
        });
      }

      posthog.capture({
        distinctId: req.user.userId,
        event: 'booking_created',
        properties: {
          booking_id: booking.id,
          salon_id: salonId,
          total_amount: totalPrice,
          total_duration: totalDuration,
          service_count: resolvedServices.length,
          service_names: resolvedServices.map((s) => s.serviceName),
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Booking failed' });
    }
  });

  app.get('/api/bookings/my', requireAuth, async (req: Request, res: Response) => {
    try {
      await expireStalePendingBookings(prisma, { userId: req.user.userId });

      const [bookings, reviews] = await Promise.all([
        prisma.booking.findMany({
          where: { userId: req.user.userId },
          include: {
            salon: {
              include: {
                owner: { select: { name: true, phone: true } },
              },
            },
            services: { include: { service: true } },
            staff: true,
          },
          orderBy: { startTime: 'desc' },
        }),
        prisma.review.findMany({
          where: { userId: req.user.userId },
        }),
      ]);

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

      await expireStalePendingBookings(prisma, { salonId: salon.id });
      
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

      await expireStalePendingBookings(prisma, { bookingId: booking.id });
      const currentBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      if (!currentBooking) return res.status(404).json({ error: 'Booking not found' });

      if (
        currentBooking.status === 'PENDING' &&
        !isBookingUpcoming(currentBooking.startTime) &&
        (status === 'CONFIRMED' || status === 'PENDING')
      ) {
        return res.status(400).json({ error: 'This booking has expired because the appointment time has passed.' });
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

        if (status !== 'NO_SHOW' || currentBooking.status === 'NO_SHOW') {
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

      posthog.capture({
        distinctId: req.user.userId,
        event: 'booking_status_updated',
        properties: {
          booking_id: req.params.id,
          new_status: status,
          salon_id: booking.salonId,
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
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
      posthog.capture({
        distinctId: req.user.userId,
        event: 'review_submitted',
        properties: {
          salon_id: salonId,
          rating: parseInt(rating),
          has_comment: Boolean(comment),
          $session_id: req.headers['x-posthog-session-id'] as string | undefined,
        },
      });
      invalidateSalonsListCache();
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
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, gender: user.gender, avatarUrl: user.avatarUrl });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Upload user avatar
  app.post('/api/users/avatar', requireAuth, (req: Request, res: Response) => {
    userAvatarUpload.single('avatar')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Avatar must be 5MB or smaller' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      try {
        let newAvatarUrl: string;
        const supabaseAdmin = getSupabaseAdminClient();

        if (supabaseAdmin) {
          const ext = path.extname(file.originalname) || '.jpg';
          const objectPath = `${SUPABASE_STORAGE_FOLDER}/avatars/${req.user.userId}-${Date.now()}${ext}`;
          const fileBuffer = await fs.promises.readFile(file.path);

          const { error: uploadError } = await supabaseAdmin.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(objectPath, fileBuffer, {
              contentType: file.mimetype || 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw new Error(uploadError.message);

          const { data } = supabaseAdmin.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
          newAvatarUrl = data.publicUrl;
        } else {
          newAvatarUrl = `/uploads/avatars/${file.filename}`;
        }

        const user = await prisma.user.update({
          where: { id: req.user.userId },
          data: { avatarUrl: newAvatarUrl },
        });

        return res.json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          gender: user.gender,
          avatarUrl: user.avatarUrl,
        });
      } catch (uploadError: any) {
        return res.status(500).json({ error: uploadError?.message || 'Failed to upload avatar' });
      } finally {
        if (file.path) {
          try { await fs.promises.unlink(file.path); } catch {}
        }
      }
    });
  });

  // Remove user avatar
  app.delete('/api/users/avatar', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { avatarUrl: null },
      });
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to remove avatar' });
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

  // Admin: Reset a user's password
  app.put('/api/admin/users/:id/password', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { password } = req.body;
      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.role === 'ADMIN') return res.status(400).json({ error: 'Cannot reset an admin password' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset password' });
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

  app.post('/api/admin/salons', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { name, address, openTime, closeTime, categories, images, listedPhone, source, sourceUrl } = req.body;
    if (!name || !address || !openTime || !closeTime) {
      return res.status(400).json({ error: 'name, address, openTime, and closeTime are required' });
    }
    try {
      const systemSeller = await getOrCreateSystemSeller();
      const coords = await geocodeSalonAddress(address, name);
      const salon = await prisma.salon.create({
        data: {
          ownerId: systemSeller.id,
          name,
          address,
          openTime,
          closeTime,
          categories: categories ?? null,
          images: images ?? null,
          listedPhone: listedPhone ? String(listedPhone).replace(/\D/g, '') : null,
          source: source ?? null,
          sourceUrl: sourceUrl ?? null,
          claimToken: crypto.randomBytes(24).toString('hex'),
          claimedAt: null,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        },
      });
      await ensureSalonDefaultStaff(prisma, salon.id);
      invalidateSalonsListCache();
      res.status(201).json(salon);
    } catch (error) {
      console.error('Error creating admin unclaimed salon:', error);
      res.status(500).json({ error: 'Failed to create salon' });
    }
  });

  app.post('/api/admin/salons/import/csv', requireAuth, (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    csvUpload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: 'Invalid CSV upload request' });
      }
      try {
        const csvText = req.file?.buffer?.toString('utf8') || String(req.body?.csv || '');
        if (!csvText.trim()) {
          return res.status(400).json({ error: 'Upload a CSV file or provide csv text in body' });
        }

        const rows = parseCsv(csvText);
        if (!rows.length) {
          return res.status(400).json({ error: 'CSV must include header and at least one row' });
        }

        const requiredHeaders = ['name', 'address'];
        const headerSet = new Set(Object.keys(rows[0]).map((key) => key.toLowerCase()));
        const missing = requiredHeaders.filter((header) => !headerSet.has(header));
        if (missing.length > 0) {
          return res.status(400).json({ error: `Missing required CSV columns: ${missing.join(', ')}` });
        }

        const systemSeller = await getOrCreateSystemSeller();
        const created: Array<{ id: string; name: string }> = [];
        const skipped: Array<{ row: number; reason: string; name?: string }> = [];
        const seenBatch = new Set<string>();

        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index];
          const rowNumber = index + 2;
          const name = String(row.name || '').trim();
          const address = String(row.address || '').trim();
          const openTime = String(row.opentime || row.open_time || '10:00').trim() || '10:00';
          const closeTime = String(row.closetime || row.close_time || '20:00').trim() || '20:00';
          const listedPhone = String(row.listedphone || row.listed_phone || '').replace(/\D/g, '');
          const source = String(row.source || 'CSV_IMPORT').trim() || 'CSV_IMPORT';
          const sourceUrl = String(row.sourceurl || row.source_url || '').trim() || null;
          const categories = String(row.categories || '').trim() || null;
          const images = String(row.images || '').trim() || null;

          if (!name || !address) {
            skipped.push({ row: rowNumber, reason: 'Missing name or address', name });
            continue;
          }

          const dedupeKey = `${name.toLowerCase()}::${address.toLowerCase()}`;
          if (seenBatch.has(dedupeKey)) {
            skipped.push({ row: rowNumber, reason: 'Duplicate in same CSV', name });
            continue;
          }
          seenBatch.add(dedupeKey);

          const existing = await prisma.salon.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, address: { equals: address, mode: 'insensitive' } },
            select: { id: true },
          });
          if (existing) {
            skipped.push({ row: rowNumber, reason: 'Already exists', name });
            continue;
          }

          const coords = await geocodeSalonAddress(address, name);
          const salon = await prisma.salon.create({
            data: {
              ownerId: systemSeller.id,
              name,
              address,
              openTime,
              closeTime,
              listedPhone: listedPhone || null,
              source,
              sourceUrl,
              categories,
              images,
              claimToken: crypto.randomBytes(24).toString('hex'),
              claimedAt: null,
              ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
            },
            select: { id: true, name: true },
          });
          await ensureSalonDefaultStaff(prisma, salon.id);
          created.push(salon);
        }

        invalidateSalonsListCache();
        return res.status(201).json({
          totalRows: rows.length,
          createdCount: created.length,
          skippedCount: skipped.length,
          created,
          skipped,
        });
      } catch (error: any) {
        console.error('CSV import failed:', error);
        return res.status(500).json({ error: error?.message || 'Failed to import CSV' });
      }
    });
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
      await expireStalePendingBookings(prisma, { salonId: req.params.id });

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
      const coords = await geocodeSalonAddress(address, name);
      const salon = await prisma.salon.update({
        where: { id: req.params.id },
        data: {
          name,
          address,
          openTime,
          closeTime,
          images,
          categories,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        },
      });
      invalidateSalonsListCache();
      res.json(salon);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update salon' });
    }
  });

  app.post('/api/admin/salons/:id/services/extract-from-menu', requireAuth, (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    handleMenuImageUpload(req, res, async (file) => {
      const salon = await prisma.salon.findUnique({ where: { id: req.params.id } });
      if (!salon) {
        res.status(404).json({ error: 'Salon not found' });
        return;
      }

      const result = await extractServicesFromMenuFile(file);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      const traceId = crypto.randomUUID();
      posthog.capture({
        distinctId: req.user.userId,
        event: '$ai_generation',
        properties: {
          $ai_trace_id: traceId,
          $ai_model: result.meta.model,
          $ai_provider: 'google',
          $ai_input_tokens: result.meta.inputTokens,
          $ai_output_tokens: result.meta.outputTokens,
          $ai_latency: result.meta.latencyMs / 1000,
          $ai_span_name: 'menu_extraction',
          $ai_is_error: false,
        },
      });
      res.json({ services: result.services });
    });
  });

  app.post('/api/admin/salons/:id/services/bulk', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    try {
      const salon = await prisma.salon.findUnique({ where: { id: req.params.id } });
      if (!salon) return res.status(404).json({ error: 'Salon not found' });

      const result = await bulkImportServicesForSalon(salon.id, req.body.services);
      if (result.ok === false) {
        return res.status(result.status).json({ error: result.error });
      }

      if (result.created.length > 0) {
        invalidateSalonsListCache();
      }

      res.json({ created: result.created, skipped: result.skipped });
    } catch (error: any) {
      console.error('Admin bulk import services failed:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Failed to import services';
      res.status(500).json({ error: message });
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
      invalidateSalonsListCache();
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
      invalidateSalonsListCache();
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

      await syncStaffAvailabilityFromSalonHours(prisma, req.params.id, staff.id);

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

  // Booking quick-action (token link + authenticated salon owner or admin)
  const assertCanManageBookingAction = (
    req: Request,
    res: Response,
    booking: { salon: { ownerId: string } }
  ): boolean => {
    if (req.user.role === 'ADMIN') return true;
    if (req.user.role !== 'SELLER') {
      res.status(403).json({ error: 'Only salon owners can manage booking requests' });
      return false;
    }
    if (booking.salon.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'You are not authorized to manage this booking' });
      return false;
    }
    return true;
  };

  app.get('/api/bookings/action/:token', requireAuth, async (req: Request, res: Response) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { actionToken: req.params.token },
        include: {
          user: { select: { name: true, phone: true } },
          salon: { select: { name: true, ownerId: true } },
          staff: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      });
      if (!booking) return res.status(404).json({ error: 'Booking not found or link expired' });
      if (!assertCanManageBookingAction(req, res, booking)) return;
      await expireStalePendingBookings(prisma, { bookingId: booking.id });
      const refreshed = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: { select: { name: true, phone: true } },
          salon: { select: { name: true, ownerId: true } },
          staff: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      });
      res.json(refreshed);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  app.post('/api/bookings/action/:token', requireAuth, async (req: Request, res: Response) => {
    const { action } = req.body;
    if (!['CONFIRMED', 'CANCELLED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use CONFIRMED or CANCELLED.' });
    }
    try {
      const booking = await prisma.booking.findUnique({
        where: { actionToken: req.params.token },
        include: { salon: true },
      });
      if (!booking) return res.status(404).json({ error: 'Booking not found or link expired' });
      if (!assertCanManageBookingAction(req, res, booking)) return;

      await expireStalePendingBookings(prisma, { bookingId: booking.id });
      const currentBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      if (!currentBooking) return res.status(404).json({ error: 'Booking not found or link expired' });

      if (currentBooking.status !== 'PENDING') {
        return res.status(400).json({ error: `Cannot change status from ${currentBooking.status}` });
      }

      if (!isBookingUpcoming(currentBooking.startTime)) {
        return res.status(400).json({ error: 'This booking has expired because the appointment time has passed.' });
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: action },
      });
      if (action === 'CONFIRMED') {
        posthog.capture({
          distinctId: req.user.userId,
          event: 'booking_confirmed_by_seller',
          properties: {
            booking_id: booking.id,
            salon_id: booking.salonId,
            $session_id: req.headers['x-posthog-session-id'] as string | undefined,
          },
        });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Health
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/public/stats', async (_req: Request, res: Response) => {
    try {
      const salons = await prisma.salon.findMany({
        select: {
          address: true,
          _count: { select: { services: true, reviews: true } },
        },
      });
      const cityKeywords = [
        'delhi', 'mumbai', 'bangalore', 'bengaluru', 'hyderabad', 'pune', 'chennai',
        'kolkata', 'gurgaon', 'gurugram', 'noida', 'chandigarh', 'mohali', 'ahmedabad',
      ];
      const cities = new Set<string>();
      for (const salon of salons) {
        const lower = salon.address.toLowerCase();
        for (const city of cityKeywords) {
          if (lower.includes(city)) {
            cities.add(city);
            break;
          }
        }
      }
      res.json({
        salons: salons.length,
        services: salons.reduce((acc, s) => acc + s._count.services, 0),
        reviews: salons.reduce((acc, s) => acc + s._count.reviews, 0),
        cities: cities.size,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/public/testimonials', async (_req: Request, res: Response) => {
    try {
      const reviews = await prisma.review.findMany({
        where: { comment: { not: null } },
        include: {
          user: { select: { name: true, role: true } },
          salon: { select: { name: true, address: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });
      const testimonials = reviews
        .filter((r) => r.comment && r.comment.trim().length > 10)
        .map((r) => {
          const firstName = r.user.name.split(' ')[0];
          const roleLabel =
            r.user.role === 'SELLER'
              ? `Salon owner`
              : `Customer`;
          const cityMatch = r.salon.address.match(/(Delhi|Gurgaon|Gurugram|Noida|Mumbai|Bangalore|Hyderabad|Pune)/i);
          const location = cityMatch ? cityMatch[1] : 'India';
          return {
            name: firstName,
            role: `${roleLabel}, ${location}`,
            quote: r.comment!.trim(),
            rating: r.rating,
          };
        });
      res.json(testimonials);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
  });

  app.get('/api/admin/marketing', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const salons = await prisma.salon.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          featured: true,
          images: true,
          createdAt: true,
          _count: { select: { services: true, staff: true, bookings: true } },
          bookings: {
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const enriched = salons.map((s) => {
        let photoCount = 0;
        if (s.images) {
          try {
            const parsed = JSON.parse(s.images);
            photoCount = Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            photoCount = 0;
          }
        }
        const profileComplete = photoCount >= 3 && s._count.services >= 8 && s._count.staff >= 1;
        return {
          id: s.id,
          name: s.name,
          address: s.address,
          featured: s.featured,
          photoCount,
          serviceCount: s._count.services,
          staffCount: s._count.staff,
          bookingsThisWeek: s.bookings.length,
          totalBookings: s._count.bookings,
          profileComplete,
        };
      });
      res.json({
        summary: {
          totalSalons: enriched.length,
          completeProfiles: enriched.filter((s) => s.profileComplete).length,
          featuredSalons: enriched.filter((s) => s.featured).length,
          bookingsThisWeek: enriched.reduce((acc, s) => acc + s.bookingsThisWeek, 0),
        },
        salons: enriched,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch marketing data' });
    }
  });

  app.patch('/api/admin/salons/:id/featured', requireAuth, async (req: Request, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { featured } = req.body;
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ error: 'featured must be a boolean' });
      }
      const salon = await prisma.salon.update({
        where: { id: req.params.id },
        data: { featured },
      });
      invalidateSalonsListCache();
      res.json(salon);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update featured status' });
    }
  });

  app.get('/robots.txt', (_req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || 'https://salonbook.app';
    res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /booking/action/

Sitemap: ${baseUrl}/sitemap.xml
`);
  });

  app.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const baseUrl = process.env.APP_URL || 'https://salonbook.app';
      const salons = await prisma.salon.findMany({ select: { id: true, createdAt: true } });
      const staticPages = ['', 'explore', 'register', 'login', 'contact', 'terms', 'privacy'];
      const urls = [
        ...staticPages.map((p) => ({
          loc: p ? `${baseUrl}/${p}` : baseUrl,
          lastmod: new Date().toISOString().split('T')[0],
        })),
        ...salons.map((s) => ({
          loc: `${baseUrl}/salon/${s.id}`,
          lastmod: s.createdAt.toISOString().split('T')[0],
        })),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>`;
      res.type('application/xml').send(xml);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // --- Error Handler ---
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const distinctId = (req as any).user?.userId as string | undefined;
    posthog.captureException(err, distinctId, {
      method: req.method,
      path: req.path,
    });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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
    const noStoreHtml = (res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    };
    app.use(express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          noStoreHtml(res);
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.get('*', (req: Request, res: Response) => {
      noStoreHtml(res);
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
