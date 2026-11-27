import { normalizeEventCode } from '@/lib/events';

export type ScheduleTeam = {
  teamNumber: number;
  alliance: 'Red' | 'Blue';
  station: 'One' | 'Two';
};

export type ScheduleMatch = {
  id: number;
  matchNum: number;
  tournamentLevel: string;
  teams: ScheduleTeam[];
};

export type StationLock = 'none' | 'Blue-One' | 'Blue-Two' | 'Red-One' | 'Red-Two';

export interface SavedEventSession {
  code: string;
  name: string;
  season: number;
  isManual?: boolean;
  matches: ScheduleMatch[];
  lockedStation: StationLock;
  lastMatchNum: number;
  updatedAt: string;
}

export interface EventStoreState {
  activeEventCode: string;
  events: SavedEventSession[];
}

export const EVENTS_STORAGE_KEY = 'nautilus_4010_events_v2';
export const LEGACY_EVENT_STORAGE_KEY = 'nautilus_4010_event_schedule_v1';

const EMPTY_STORE: EventStoreState = {
  activeEventCode: '',
  events: [],
};

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function writeEventStore(state: EventStoreState): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error guardando eventos en localStorage:', err);
  }
}

function sanitizeSession(raw: any): SavedEventSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const code = normalizeEventCode(raw.code);
  if (!code) return null;

  const validStations: StationLock[] = ['none', 'Blue-One', 'Blue-Two', 'Red-One', 'Red-Two'];
  const lockedStation: StationLock = validStations.includes(raw.lockedStation) ? raw.lockedStation : 'none';
  const lastMatchNum = Number.isFinite(Number(raw.lastMatchNum)) && Number(raw.lastMatchNum) >= 1
    ? Math.floor(Number(raw.lastMatchNum))
    : 1;

  return {
    code,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : code,
    season: Number.isFinite(Number(raw.season)) ? Number(raw.season) : 2026,
    isManual: Boolean(raw.isManual),
    matches: Array.isArray(raw.matches) ? raw.matches : [],
    lockedStation,
    lastMatchNum,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function readEventStore(): EventStoreState {
  if (!hasStorage()) return EMPTY_STORE;

  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const events: SavedEventSession[] = Array.isArray(parsed?.events)
        ? parsed.events.map(sanitizeSession).filter((s: SavedEventSession | null): s is SavedEventSession => Boolean(s))
        : [];
      const normalizedActive = normalizeEventCode(parsed?.activeEventCode);
      const activeExists = normalizedActive && events.some((ev) => ev.code === normalizedActive);
      return {
        activeEventCode: activeExists ? normalizedActive : '',
        events,
      };
    }

    // Migración automática desde v1
    const legacyRaw = window.localStorage.getItem(LEGACY_EVENT_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const legacyCode = normalizeEventCode(legacy?.eventInfo?.code);
      if (legacyCode) {
        const migrated: SavedEventSession = {
          code: legacyCode,
          name: typeof legacy?.eventInfo?.name === 'string' && legacy.eventInfo.name.trim()
            ? legacy.eventInfo.name.trim()
            : legacyCode,
          season: Number.isFinite(Number(legacy?.eventInfo?.season)) ? Number(legacy.eventInfo.season) : 2026,
          isManual: false,
          matches: Array.isArray(legacy?.matches) ? legacy.matches : [],
          lockedStation: ['none', 'Blue-One', 'Blue-Two', 'Red-One', 'Red-Two'].includes(legacy?.lockedStation)
            ? legacy.lockedStation
            : 'none',
          lastMatchNum: 1,
          updatedAt: new Date().toISOString(),
        };
        const nextState: EventStoreState = {
          activeEventCode: legacyCode,
          events: [migrated],
        };
        writeEventStore(nextState);
        return nextState;
      }
    }
  } catch (err) {
    console.error('Error leyendo tienda multi-evento:', err);
  }

  return EMPTY_STORE;
}

export function upsertEventSession(
  session: SavedEventSession,
  options?: { setActive?: boolean }
): EventStoreState {
  const current = readEventStore();
  const normalized = sanitizeSession(session);
  if (!normalized) return current;

  const idx = current.events.findIndex((ev) => ev.code === normalized.code);
  const nextEvents =
    idx >= 0
      ? current.events.map((ev, i) => (i === idx ? normalized : ev))
      : [...current.events, normalized];

  const nextState: EventStoreState = {
    activeEventCode: options?.setActive === false ? current.activeEventCode : normalized.code,
    events: nextEvents,
  };
  writeEventStore(nextState);
  return nextState;
}

export function updateEventSessionFields(
  code: string,
  patch: Partial<Pick<SavedEventSession, 'name' | 'season' | 'matches' | 'lockedStation' | 'lastMatchNum' | 'isManual'>>
): EventStoreState {
  const current = readEventStore();
  const targetCode = normalizeEventCode(code);
  if (!targetCode) return current;

  const idx = current.events.findIndex((ev) => ev.code === targetCode);
  if (idx < 0) return current;

  const updated = sanitizeSession({
    ...current.events[idx],
    ...patch,
    code: targetCode,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return current;

  const nextEvents = current.events.map((ev, i) => (i === idx ? updated : ev));
  const nextState: EventStoreState = {
    activeEventCode: current.activeEventCode,
    events: nextEvents,
  };
  writeEventStore(nextState);
  return nextState;
}

export function setActiveEventCodeInStore(code: string): EventStoreState {
  const current = readEventStore();
  const normalized = normalizeEventCode(code);
  const activeExists = normalized && current.events.some((ev) => ev.code === normalized);
  const nextState: EventStoreState = {
    activeEventCode: activeExists ? normalized : '',
    events: current.events,
  };
  writeEventStore(nextState);
  return nextState;
}

export function removeEventSession(code: string): EventStoreState {
  const current = readEventStore();
  const targetCode = normalizeEventCode(code);
  const nextEvents = current.events.filter((ev) => ev.code !== targetCode);
  const nextActive =
    current.activeEventCode === targetCode
      ? nextEvents[0]?.code ?? ''
      : current.activeEventCode;

  const nextState: EventStoreState = {
    activeEventCode: nextActive,
    events: nextEvents,
  };
  writeEventStore(nextState);
  return nextState;
}

export function readEventCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = new URLSearchParams(window.location.search).get('event');
    return normalizeEventCode(raw);
  } catch {
    return '';
  }
}
