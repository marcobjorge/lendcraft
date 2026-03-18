import { db } from './db';

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function autocompleteCard(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  const cached = await db.cardCache.get(query.toLowerCase());
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.results;
  }

  const res = await fetch(
    `https://api.scryfall.com/cards/autocomplete?include_extras=true&q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results: string[] = data.data ?? [];

  await db.cardCache.put({
    query: query.toLowerCase(),
    results,
    cachedAt: Date.now(),
  });

  return results;
}

export function getCardImageUrl(cardName: string): string {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=small`;
}
