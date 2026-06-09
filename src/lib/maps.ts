export type SalonLocation = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  name?: string | null;
};

/** Normalize Google Maps LatLng objects and plain { lat, lng } literals. */
export function extractLatLng(location: unknown): { lat: number; lng: number } | null {
  if (!location || typeof location !== 'object') return null;

  const loc = location as { lat?: number | (() => number); lng?: number | (() => number) };
  const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
  const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Build a Google Maps directions URL, preferring stored coordinates over text geocoding. */
export function buildGoogleMapsDirectionsUrl(location: SalonLocation): string {
  const coords = extractLatLng(
    location.lat != null && location.lng != null ? { lat: location.lat, lng: location.lng } : null
  );

  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }

  const query = [location.name, location.address].filter(Boolean).join(', ');
  if (query) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  }

  return 'https://www.google.com/maps';
}
