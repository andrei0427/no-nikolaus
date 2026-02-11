import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FerrySchedule } from './types.js';
import { sendTelegramAlert } from './telegram.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '..', 'cache');

interface ScheduleTimeEntry {
  name: string; // "09:00"
  slug: string;
}

interface ScheduleResponse {
  date: string;
  times: {
    cirkewwa: ScheduleTimeEntry[];
    mgarr: ScheduleTimeEntry[];
  };
}

let cachedSchedule: FerrySchedule | null = null;

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCachePath(dateStr: string): string {
  return join(CACHE_DIR, `schedule-${dateStr}.json`);
}

function deduplicateTimes(entries: ScheduleTimeEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    if (!seen.has(entry.name)) {
      seen.add(entry.name);
      result.push(entry.name);
    }
  }
  return result;
}

function parseSchedule(data: ScheduleResponse): FerrySchedule {
  return {
    date: data.date,
    cirkewwa: deduplicateTimes(data.times.cirkewwa),
    mgarr: deduplicateTimes(data.times.mgarr),
  };
}

function loadFromCache(dateStr: string): FerrySchedule | null {
  const path = getCachePath(dateStr);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as FerrySchedule;
  } catch {
    return null;
  }
}

function saveToCache(dateStr: string, schedule: FerrySchedule): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(getCachePath(dateStr), JSON.stringify(schedule, null, 2));
}

async function fetchFromApi(dateStr: string): Promise<FerrySchedule | null> {
  const [year, month, day] = dateStr.split('-');
  const url = `https://static.gozochannel.com/schedules/${year}/${month}/${day}/passenger.json`;
  console.log(`Fetching ferry schedule from ${url}`);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error(`Schedule fetch failed: ${res.status} ${res.statusText}`);
      sendTelegramAlert(`Schedule fetch error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as ScheduleResponse;
    return parseSchedule(data);
  } catch (err) {
    console.error('Failed to fetch schedule:', err);
    sendTelegramAlert(`Schedule fetch error: ${err}`);
    return null;
  }
}

export async function initSchedule(): Promise<void> {
  const dateStr = getTodayDateString();

  // Try cache first
  const cached = loadFromCache(dateStr);
  if (cached) {
    console.log(`Loaded ferry schedule from cache for ${dateStr}`);
    cachedSchedule = cached;
    return;
  }

  // Fetch from API
  const schedule = await fetchFromApi(dateStr);
  if (schedule) {
    saveToCache(dateStr, schedule);
    cachedSchedule = schedule;
    console.log(
      `Fetched ferry schedule for ${dateStr}: ${schedule.cirkewwa.length} Cirkewwa departures, ${schedule.mgarr.length} Mgarr departures`
    );
  } else {
    console.warn('Could not load ferry schedule');
  }
}

export function getSchedule(): FerrySchedule | null {
  // Check if we need to refresh (new day)
  const today = getTodayDateString();
  if (cachedSchedule && cachedSchedule.date !== today) {
    // Schedule is stale, clear it and trigger async refresh
    cachedSchedule = null;
    initSchedule();
  }
  return cachedSchedule;
}
