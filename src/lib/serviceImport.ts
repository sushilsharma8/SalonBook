import type { ImportedServiceDraft } from '../components/seller/SellerDashboardForms';

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
