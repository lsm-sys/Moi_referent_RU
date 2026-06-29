import type { ParsedArticle } from "@/lib/parse-article";

const CACHE_TTL_MS = 20 * 60 * 1000;

type CacheEntry = {
  article: ParsedArticle;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __parseArticleCache: Map<string, CacheEntry> | undefined;
}

const cache = globalThis.__parseArticleCache ??= new Map<string, CacheEntry>();

export function normalizeArticleUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";

  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
}

export function getCachedArticle(url: string): ParsedArticle | null {
  const key = normalizeArticleUrl(url);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.article;
}

export function setCachedArticle(url: string, article: ParsedArticle): void {
  const key = normalizeArticleUrl(url);

  cache.set(key, {
    article,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearParseCache(): void {
  cache.clear();
}

/** Удаляет просроченные записи (вызывается периодически). */
export function pruneParseCache(): void {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

export { CACHE_TTL_MS };
