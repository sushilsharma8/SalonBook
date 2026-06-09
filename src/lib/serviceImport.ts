import type { ImportedServiceDraft } from '../components/seller/SellerDashboardForms';

const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

export async function prepareMenuImageForUpload(file: File): Promise<File> {
  const mime = (file.type || '').toLowerCase();
  if (HEIC_TYPES.has(mime) || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) {
    throw new Error(
      'HEIC photos are not supported. On iPhone go to Settings → Camera → Formats → Most Compatible, then retake the photo.',
    );
  }

  if (file.size <= 2 * 1024 * 1024 && (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png')) {
    return file;
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 2048;
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'menu-photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function mapExtractedServicesToDrafts(extracted: unknown[]): ImportedServiceDraft[] {
  return extracted
    .map((service: any) => ({
      name: String(service?.name || '').trim(),
      variants: Array.isArray(service?.variants)
        ? service.variants.map((variant: any) => ({
            targetGender: String(variant?.targetGender || 'UNISEX').toUpperCase(),
            price: String(variant?.price ?? ''),
            duration: String(variant?.duration ?? ''),
          }))
        : [],
    }))
    .filter((service) => service.name && service.variants.length > 0);
}

export function normalizeImportedServicesForApi(services: ImportedServiceDraft[]) {
  const cleaned = services
    .map((service) => {
      const name = service.name.trim();
      const normalizedVariants = service.variants
        .map((variant) => ({
          ...variant,
          price: String(variant.price).trim(),
          duration: String(variant.duration).trim(),
        }))
        .filter((variant) => variant.price || variant.duration);

      return { name, variants: normalizedVariants };
    })
    .filter((service) => service.name && service.variants.length > 0);

  if (cleaned.length === 0) {
    return { ok: false as const, error: 'Add at least one service with a name and one valid variant.' };
  }

  for (const service of cleaned) {
    const hasIncompleteRow = service.variants.some((variant) => !variant.price || !variant.duration);
    if (hasIncompleteRow) {
      return { ok: false as const, error: `${service.name}: each variant must have both price and duration.` };
    }

    const hasInvalidNumbers = service.variants.some((variant) => {
      const price = Number(variant.price);
      const duration = Number(variant.duration);
      return !Number.isInteger(price) || price <= 0 || !Number.isInteger(duration) || duration <= 0;
    });
    if (hasInvalidNumbers) {
      return { ok: false as const, error: `${service.name}: price and duration must be positive whole numbers.` };
    }
  }

  return {
    ok: true as const,
    services: cleaned.map((service) => ({
      name: service.name,
      variants: service.variants.map((variant) => ({
        targetGender: variant.targetGender,
        price: Number(variant.price),
        duration: Number(variant.duration),
      })),
    })),
  };
}
