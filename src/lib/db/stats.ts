import { promises as fs } from 'fs';
import path from 'path';
import { getDataRoot } from '@/lib/data-root';
import { ensureDir, deleteFile } from './json-store';
import type { StatsEvent, UserStatsDay } from '@/types/stats';

const DATA_DIR = path.join(getDataRoot(), 'data');
const STATS_DIR = path.join(DATA_DIR, 'stats');

/** Bezpieczny fragment ścieżki – tylko znaki dozwolone w nazwach katalogów. */
function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function getUserDir(userId: string): string {
  return path.join(STATS_DIR, safeUserId(userId));
}

function getDayFilePath(userId: string, dateStr: string): string {
  // dateStr = YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format, expected YYYY-MM-DD');
  }
  return path.join(getUserDir(userId), `${dateStr}.json`);
}

export function getDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dopisuje zdarzenie do pliku dnia. Jeden dzień = jeden plik. */
export async function appendEvent(
  userId: string,
  dateStr: string,
  event: StatsEvent
): Promise<void> {
  const filePath = getDayFilePath(userId, dateStr);
  const userDir = path.dirname(filePath);
  await ensureDir(userDir);

  let day: UserStatsDay;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    day = JSON.parse(content) as UserStatsDay;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      day = { date: dateStr, userId, events: [] };
    } else {
      throw err;
    }
  }

  day.events.push(event);
  await fs.writeFile(filePath, JSON.stringify(day, null, 2), 'utf-8');
}

/** Zwraca listę dat (YYYY-MM-DD), dla których użytkownik ma pliki statystyk. */
export async function getStatsDaysForUser(userId: string): Promise<string[]> {
  const userDir = getUserDir(userId);
  try {
    const files = await fs.readdir(userDir);
    const dates = files
      .filter((f) => f.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace('.json', ''))
      .sort();
    return dates;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/** Pobiera zawartość jednego dnia. */
export async function getStatsDay(
  userId: string,
  dateStr: string
): Promise<UserStatsDay | null> {
  const filePath = getDayFilePath(userId, dateStr);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as UserStatsDay;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/** Pobiera statystyki użytkownika – wszystkie dni (tylko metadane: data + liczba zdarzeń) lub pełna zawartość. */
export async function getStatsForUser(
  userId: string,
  options?: { full?: boolean }
): Promise<{ date: string; eventCount: number; day?: UserStatsDay }[]> {
  const dates = await getStatsDaysForUser(userId);
  const result: { date: string; eventCount: number; day?: UserStatsDay }[] = [];

  for (const dateStr of dates) {
    const day = await getStatsDay(userId, dateStr);
    if (!day) continue;
    const item: { date: string; eventCount: number; day?: UserStatsDay } = {
      date: dateStr,
      eventCount: day.events.length,
    };
    if (options?.full) {
      item.day = day;
    }
    result.push(item);
  }

  return result;
}

/** Lista ID użytkowników (katalogów), którzy mają jakiekolwiek statystyki. */
export async function listUserIdsWithStats(): Promise<string[]> {
  try {
    await ensureDir(STATS_DIR);
    const entries = await fs.readdir(STATS_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/** Usuwa pliki dni starsze niż podana liczba dni. Jeśli podano userId – tylko ten użytkownik; inaczej wszyscy. */
export async function deleteStatsOlderThan(
  olderThanDays: number,
  userId?: string
): Promise<{ deleted: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = getDateString(cutoff);
  let deleted = 0;

  const userIds = userId ? [safeUserId(userId)] : await listUserIdsWithStats();

  for (const uid of userIds) {
    const userDir = path.join(STATS_DIR, uid);
    try {
      const files = await fs.readdir(userDir);
      for (const f of files) {
        if (!f.endsWith('.json') || !/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) {
          continue;
        }
        const dateStr = f.replace('.json', '');
        if (dateStr < cutoffStr) {
          await deleteFile(path.join(userDir, f));
          deleted++;
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  return { deleted };
}
