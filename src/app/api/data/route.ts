import { NextResponse } from 'next/server';
import {
  batchGetSheetRanges,
  formatSheetRange,
  getSheetRows,
  listSheetTitles,
} from '@/lib/googleSheets';
import {
  ALL_EVENTS_KEY,
  DEFAULT_EVENT_KEY,
  MATCH_SHEET_PREFIX,
  extractAvailableEvents,
  getMatchSheetName,
  normalizeEventCode,
} from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapRowsToMatches(rows: any[][], eventCode: string, sheetName: string, startId: number) {
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
      return obj;
    });
}

export async function GET(request: Request) {
  try {
    const rawEvent = new URL(request.url).searchParams.get('event')?.trim();
    const titles = await listSheetTitles();
    const availableEvents = extractAvailableEvents(titles, MATCH_SHEET_PREFIX);

    if (rawEvent && rawEvent.toUpperCase() === ALL_EVENTS_KEY) {
      if (availableEvents.length === 0) {
        return NextResponse.json({
          success: true,
          eventCode: ALL_EVENTS_KEY,
          sheetName: ALL_EVENTS_KEY,
          availableEvents: [],
          count: 0,
          matches: [],
        });
      }

      const ranges = availableEvents.map((ev) => formatSheetRange(ev.sheetName, 'A1:AE'));
      const valueRanges = await batchGetSheetRanges(ranges);

      const matches: Record<string, any>[] = [];
      let nextId = 1;
      availableEvents.forEach((ev, idx) => {
        const rows = valueRanges[idx]?.values || [];
        const mapped = mapRowsToMatches(rows, ev.code, ev.sheetName, nextId);
        nextId += mapped.length;
        matches.push(...mapped);
      });

      return NextResponse.json({
        success: true,
        eventCode: ALL_EVENTS_KEY,
        sheetName: ALL_EVENTS_KEY,
        availableEvents,
        count: matches.length,
        matches,
      });
    }

    let requestedCode = '';
    let targetSheet = MATCH_SHEET_PREFIX;

    if (rawEvent !== undefined) {
      requestedCode = rawEvent.toUpperCase() === DEFAULT_EVENT_KEY ? '' : normalizeEventCode(rawEvent);
      targetSheet = getMatchSheetName(requestedCode);
    } else if (titles.includes(MATCH_SHEET_PREFIX)) {
      requestedCode = '';
      targetSheet = MATCH_SHEET_PREFIX;
    } else if (availableEvents.length > 0) {
      requestedCode = availableEvents[0].code;
      targetSheet = availableEvents[0].sheetName;
    }

    if (!titles.includes(targetSheet)) {
      return NextResponse.json({
        success: true,
        eventCode: requestedCode,
        sheetName: targetSheet,
        availableEvents,
        count: 0,
        matches: [],
      });
    }

    const rows = await getSheetRows(targetSheet, 'A1:AE');
    const matches = mapRowsToMatches(rows, requestedCode, targetSheet, 1);

    return NextResponse.json({
      success: true,
      eventCode: requestedCode,
      sheetName: targetSheet,
      availableEvents,
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error('Error al leer datos de Sheets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al leer de Google Sheets' },
      { status: 500 }
    );
  }
}
