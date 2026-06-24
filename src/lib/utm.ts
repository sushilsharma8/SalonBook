const UTM_STORAGE_KEY = 'salonbook:utm';

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

export function buildSalonUrl(
  salonId: string,
  params: UtmParams = { utm_source: 'qr', utm_medium: 'salon', utm_campaign: salonId },
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const search = new URLSearchParams();
  if (params.utm_source) search.set('utm_source', params.utm_source);
  if (params.utm_medium) search.set('utm_medium', params.utm_medium);
  if (params.utm_campaign) search.set('utm_campaign', params.utm_campaign);
  if (params.utm_content) search.set('utm_content', params.utm_content);
  const qs = search.toString();
  return `${origin}/salon/${salonId}${qs ? `?${qs}` : ''}`;
}

export function captureUtmFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }
}

export function getStoredUtm(): UtmParams | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : null;
  } catch {
    return null;
  }
}
