import Dexie, { type EntityTable } from 'dexie';

export interface LendingEvent {
  id: string;
  type: 'lend' | 'return';
  cardName: string;
  scryfallId?: string;
  setCode?: string;
  lenderName: string;
  borrowerName: string;
  timestamp: number;
  returnOfEventId?: string;
  note?: string;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface Friend {
  name: string;
}

export interface CardCache {
  query: string;
  results: string[];
  cachedAt: number;
}

export interface LocalEventMarker {
  eventId: string;
}

const db = new Dexie('Lendcraft') as Dexie & {
  events: EntityTable<LendingEvent, 'id'>;
  settings: EntityTable<AppSettings, 'key'>;
  friends: EntityTable<Friend, 'name'>;
  cardCache: EntityTable<CardCache, 'query'>;
  localEvents: EntityTable<LocalEventMarker, 'eventId'>;
};

db.version(1).stores({
  events: 'id, type, cardName, lenderName, borrowerName, timestamp, returnOfEventId',
  settings: 'key',
  friends: 'name',
  cardCache: 'query, cachedAt',
});

db.version(2).stores({
  events: 'id, type, cardName, lenderName, borrowerName, timestamp, returnOfEventId',
  settings: 'key',
  friends: 'name',
  cardCache: 'query, cachedAt',
  localEvents: 'eventId',
});

export { db };

export function generateEventId(event: Omit<LendingEvent, 'id'>): string {
  const core = `${event.lenderName}|${event.borrowerName}|${event.cardName}|${event.timestamp}|${event.type}`;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < core.length; i++) {
    const c = core.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export async function getMyName(): Promise<string | null> {
  const setting = await db.settings.get('myName');
  return setting?.value ?? null;
}

export async function setMyName(name: string): Promise<void> {
  await db.settings.put({ key: 'myName', value: name });
}

export async function getFriends(): Promise<string[]> {
  const friends = await db.friends.toArray();
  return friends.map(f => f.name);
}

export async function addFriend(name: string): Promise<void> {
  await db.friends.put({ name });
}

export async function removeFriend(name: string): Promise<void> {
  await db.friends.delete(name);
}

/** Add event created on this device (marks it as local) */
export async function addLocalEvent(event: LendingEvent): Promise<boolean> {
  const existing = await db.events.get(event.id);
  if (existing) return false;
  await db.events.add(event);
  await db.localEvents.put({ eventId: event.id });
  if (event.borrowerName) await db.friends.put({ name: event.borrowerName });
  return true;
}

/** Add event from import (not marked as local) */
export async function addImportedEvent(event: LendingEvent): Promise<boolean> {
  const existing = await db.events.get(event.id);
  if (existing) return false;
  await db.events.add(event);
  if (event.lenderName) await db.friends.put({ name: event.lenderName });
  return true;
}

export async function isLocalEvent(eventId: string): Promise<boolean> {
  return !!(await db.localEvents.get(eventId));
}

export async function getLocalEventIds(): Promise<Set<string>> {
  const markers = await db.localEvents.toArray();
  return new Set(markers.map(m => m.eventId));
}

export interface ActiveLoan {
  event: LendingEvent;
  isLocal: boolean;
}

export async function getActiveLoans(): Promise<ActiveLoan[]> {
  const allEvents = await db.events.orderBy('timestamp').toArray();
  const localIds = await getLocalEventIds();
  const returnedIds = new Set(
    allEvents
      .filter(e => e.type === 'return' && e.returnOfEventId)
      .map(e => e.returnOfEventId!)
  );
  return allEvents
    .filter(e => e.type === 'lend' && !returnedIds.has(e.id))
    .map(e => ({ event: e, isLocal: localIds.has(e.id) }));
}
