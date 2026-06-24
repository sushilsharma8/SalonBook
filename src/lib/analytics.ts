import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialized = true;
}

export function getPostHogHeaders(): Record<string, string> {
  if (!initialized) return {};
  const headers: Record<string, string> = {};
  const distinctId = posthog.get_distinct_id?.();
  if (distinctId) headers['x-posthog-distinct-id'] = distinctId;
  const sessionId = posthog.get_session_id?.();
  if (sessionId) headers['x-posthog-session-id'] = sessionId;
  return headers;
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}
