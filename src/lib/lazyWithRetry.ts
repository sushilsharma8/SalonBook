import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_KEY = 'salonbook:chunk-reload';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 600;

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === 'ChunkLoadError' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('load failed')
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const module = await importer();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return module;
    } catch (error) {
      lastError = error;
      if (!isChunkLoadError(error) || attempt === MAX_RETRIES - 1) break;
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  if (isChunkLoadError(lastError) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
    return new Promise(() => {});
  }

  throw lastError;
}

/** Lazy-load a route chunk with retries; reloads once if chunks are stale after a dev server restart. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(importer));
}
