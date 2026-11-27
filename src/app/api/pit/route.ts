import { NextResponse } from 'next/server';
import {
  appendRows,
  batchGetSheetRanges,
  ensureSheetWithHeaders,
  formatSheetRange,
  getSheetRows,
  invalidateEnsuredSheet,
  listSheetTitles,
} from '@/lib/googleSheets';
import {
  ALL_EVENTS_KEY,
  DEFAULT_EVENT_KEY,
  MATCH_SHEET_PREFIX,
  PIT_SHEET_PREFIX,
  extractAvailableEvents,
  getPitSheetName,
  mergeAvailableEvents,
  normalizeEventCode,
} from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PIT_HEADERS = [
  'Timestamp',
  'EQUIPO',
  'NOMBRE_EQUIPO',
  'SCOUT',
  'CHASIS',
  'PESO_LB',
  'INTAKE',
  'CAPACIDAD',
  'MECANISMO_HIVE',
  'MECANISMO_FLOR',
  'RUTINAS_AUTO',
  'LADO_AUTO',
  'SENSORES_VISION',
  'AUTO_PTS_EST',
  'HORAS_DRIVER',
  'ROL_PREFERIDO',
  'NOTAS',
  'FOTOS_COUNT',
  'FOTOS_IDS',
];

function mapRowsToPitEntries(rows: any[][], eventCode: string, sheetName: string, startId: number) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows
    .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
    .map((r, idx) => {
      const obj: Record<string, any> = {
        id: startId + idx,
        _eventCode: eventCode,
        _sheetName: sheetName,
      };
      headers.forEach((h: string, colIdx: number) => {
        obj[h] = r[colIdx] ?? '';
      });
      const rawIds = String(obj['FOTOS_IDS'] ?? '');
      obj.photoIds = rawIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return obj;
    });
}

export async function GET(request: Request) {
  try {
    const rawEvent = new URL(request.url).searchParams.get('event')?.trim();
    const titles = await listSheetTitles();
    const pitEvents = extractAvailableEvents(titles, PIT_SHEET_PREFIX);
    const matchEvents = extractAvailableEvents(titles, MATCH_SHEET_PREFIX);
    const availableEvents = mergeAvailableEvents(pitEvents, matchEvents, PIT_SHEET_PREFIX);

    if (rawEvent && rawEvent.toUpperCase() === ALL_EVENTS_KEY) {
      if (pitEvents.length === 0) {
        return NextResponse.json({
          success: true,
          eventCode: ALL_EVENTS_KEY,
          sheetName: ALL_EVENTS_KEY,
          availableEvents,
          count: 0,
          entries: [],
        });
      }

      const ranges = pitEvents.map((ev) => formatSheetRange(ev.sheetName, 'A1:S'));
      const valueRanges = await batchGetSheetRanges(ranges);

      const entries: Record<string, any>[] = [];
      let nextId = 1;
      pitEvents.forEach((ev, idx) => {
        const rows = valueRanges[idx]?.values || [];
        const mapped = mapRowsToPitEntries(rows, ev.code, ev.sheetName, nextId);
        nextId += mapped.length;
        entries.push(...mapped);
      });

      return NextResponse.json({
        success: true,
        eventCode: ALL_EVENTS_KEY,
        sheetName: ALL_EVENTS_KEY,
        availableEvents,
        count: entries.length,
        entries,
      });
    }

    const requestedCode =
      rawEvent === undefined
        ? ''
        : rawEvent.toUpperCase() === DEFAULT_EVENT_KEY
          ? ''
          : normalizeEventCode(rawEvent);

    const targetSheet = getPitSheetName(requestedCode);

    if (!titles.includes(targetSheet)) {
      return NextResponse.json({
        success: true,
        eventCode: requestedCode,
        sheetName: targetSheet,
        availableEvents,
        count: 0,
        entries: [],
      });
    }

    const rows = await getSheetRows(targetSheet, 'A1:S');
    const entries = mapRowsToPitEntries(rows, requestedCode, targetSheet, 1);

    return NextResponse.json({
      success: true,
      eventCode: requestedCode,
      sheetName: targetSheet,
      availableEvents,
      count: entries.length,
      entries,
    });
  } catch (error: any) {
    console.error('Error al leer Pit Scouting de Sheets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al leer Pit Scouting de Google Sheets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const teamNumber = Number(data?.teamNumber);

    if (!Number.isFinite(teamNumber) || teamNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'El número de equipo es obligatorio y debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const eventCode = normalizeEventCode(data?.eventCode ?? data?.event);
    const targetSheet = getPitSheetName(eventCode);

    await ensureSheetWithHeaders(targetSheet, PIT_HEADERS);

    const photoIds: string[] = Array.isArray(data.photoIds)
      ? data.photoIds.map((id: unknown) => String(id ?? '').trim()).filter(Boolean)
      : [];

    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
    const rawWeight = data.weight;
    const weightVal =
      rawWeight === '' || rawWeight === null || rawWeight === undefined
        ? ''
        : Number.isFinite(Number(rawWeight))
          ? Number(rawWeight)
          : String(rawWeight);

    const row: (string | number)[] = [
      timestamp,
      teamNumber,
      String(data.teamName || '').trim(),
      String(data.scouter || 'Scouter 4010').trim(),
      String(data.chassisType || ''),
      weightVal,
      String(data.intakeType || ''),
      String(data.capacity || ''),
      String(data.hiveMech || ''),
      String(data.flowerMech || ''),
      Array.isArray(data.autoRoutines)
        ? data.autoRoutines.join(', ')
        : String(data.autoRoutines || ''),
      String(data.autoSide || ''),
      Array.isArray(data.sensorsVision)
        ? data.sensorsVision.join(', ')
        : String(data.sensorsVision || ''),
      Number(data.claimedAutoPoints ?? 0) || 0,
      String(data.driverHours || ''),
      String(data.preferredRole || ''),
      String(data.notes || '').trim(),
      photoIds.length,
      photoIds.join(','),
    ];

    let result;
    try {
      result = await appendRows(targetSheet, [row], 'RAW');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Unable to parse range')) {
        invalidateEnsuredSheet(targetSheet);
        await ensureSheetWithHeaders(targetSheet, PIT_HEADERS);
        result = await appendRows(targetSheet, [row], 'RAW');
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      eventCode,
      sheetName: targetSheet,
      updatedRange: result.updates?.updatedRange,
      photoCount: photoIds.length,
    });
  } catch (error: any) {
    console.error('Error al guardar Pit Scouting en Sheets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar Pit Scouting en Google Sheets' },
      { status: 500 }
    );
  }
}
