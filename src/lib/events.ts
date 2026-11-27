export const MATCH_SHEET_PREFIX = 'Captura_BIOBUZZ';
export const PIT_SHEET_PREFIX = 'Pit_BIOBUZZ';
export const PIT_PHOTOS_SHEET_PREFIX = 'Pit_Fotos';

export const DEFAULT_EVENT_KEY = 'DEFAULT';
export const ALL_EVENTS_KEY = 'ALL';

export const SCOUT_HEADERS = [
  'Timestamp',
  'MATCH',
  'EQUIPO',
  'ALIANZA',
  'SCOUT',
  'POSICIÓN INICIAL',
  'AUTO LEAVE',
  'AUTO PARK',
  'AUTO HIVE POLLEN',
  'AUTO HIVE NÉCTAR',
  'AUTO FLOR POLLEN',
  'AUTO FLOR NÉCTAR',
  'TELE HIVE POLLEN',
  'TELE HIVE NÉCTAR',
  'PROPIEDAD FLOR',
  'TELE FLOR POLLEN',
  'TELE FLOR NÉCTAR',
  'BOTTOM NÉCTAR',
  'GARDEN PIEZAS',
  'DEFENSA GARDEN',
  'ENDGAME PARK',
  'ESTATUS ROBOT',
  'FALTAS MENORES',
  'FALTAS GRAVES',
  'TARJETAS',
  'PILOTO',
  'NOTAS',
  'Auto Pts',
  'TeleOp Pts',
  'Faltas Pts',
  'Puntos Netos',
];

export interface AvailableSheetEvent {
  code: string;
  label: string;
  sheetName: string;
  isDefault: boolean;
}

const RESERVED_DEFAULT_CODES = new Set(['', DEFAULT_EVENT_KEY, 'GENERAL', 'MANUAL', ALL_EVENTS_KEY]);

/**
 * Normaliza un código de evento a [A-Z0-9_-] (máx. 40 caracteres).
 * Devuelve '' para representar la hoja general/legacy sin sufijo.
 */
export function normalizeEventCode(raw?: string | null): string {
  if (!raw) return '';
  const cleaned = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  if (!cleaned || RESERVED_DEFAULT_CODES.has(cleaned)) {
    return '';
  }

  return cleaned;
}

export function getMatchSheetName(eventCode?: string | null): string {
  const code = normalizeEventCode(eventCode);
  return code ? `${MATCH_SHEET_PREFIX}_${code}` : MATCH_SHEET_PREFIX;
}

export function getPitSheetName(eventCode?: string | null): string {
  const code = normalizeEventCode(eventCode);
  return code ? `${PIT_SHEET_PREFIX}_${code}` : PIT_SHEET_PREFIX;
}

export function getPitPhotosSheetName(eventCode?: string | null): string {
  const code = normalizeEventCode(eventCode);
  return code ? `${PIT_PHOTOS_SHEET_PREFIX}_${code}` : PIT_PHOTOS_SHEET_PREFIX;
}

export function extractEventCodeFromSheetTitle(title: string, prefix: string): string | null {
  if (title === prefix) return '';
  const withUnderscore = `${prefix}_`;
  if (title.startsWith(withUnderscore)) {
    const code = title.slice(withUnderscore.length).trim();
    return code ? code : null;
  }
  return null;
}

export function extractAvailableEvents(sheetTitles: string[], prefix: string): AvailableSheetEvent[] {
  const specific: AvailableSheetEvent[] = [];
  const seen = new Set<string>();
  let hasDefault = false;

  for (const title of sheetTitles) {
    const extracted = extractEventCodeFromSheetTitle(title, prefix);
    if (extracted === null) continue;
    if (extracted === '') {
      hasDefault = true;
      continue;
    }
    if (seen.has(extracted)) continue;
    seen.add(extracted);
    specific.push({
      code: extracted,
      label: extracted,
      sheetName: title,
      isDefault: false,
    });
  }

  if (hasDefault) {
    specific.push({
      code: '',
      label: 'General',
      sheetName: prefix,
      isDefault: true,
    });
  }

  return specific;
}

export function mergeAvailableEvents(
  primary: AvailableSheetEvent[],
  secondary: AvailableSheetEvent[],
  targetPrefix: string
): AvailableSheetEvent[] {
  const specific: AvailableSheetEvent[] = [];
  const seen = new Set<string>();
  let hasDefault = false;

  const pushEntry = (ev: AvailableSheetEvent) => {
    if (ev.isDefault || ev.code === '') {
      hasDefault = true;
      return;
    }
    const normalized = normalizeEventCode(ev.code);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    specific.push({
      code: normalized,
      label: normalized,
      sheetName: `${targetPrefix}_${normalized}`,
      isDefault: false,
    });
  };

  primary.forEach(pushEntry);
  secondary.forEach(pushEntry);

  if (hasDefault) {
    specific.push({
      code: '',
      label: 'General',
      sheetName: targetPrefix,
      isDefault: true,
    });
  }

  return specific;
}
