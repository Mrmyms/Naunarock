import { NextResponse } from 'next/server';
import {
  appendRows,
  ensureSheetWithHeaders,
  getSheetRows,
} from '@/lib/googleSheets';

export const runtime = 'nodejs';

const PIT_SHEET = 'Pit_BIOBUZZ';
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
  'TIPO_ROBOT',
];

export async function GET() {
  try {
    let rows: any[][];
    try {
      rows = await getSheetRows(PIT_SHEET, 'A1:T1000');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Unable to parse range')) {
        return NextResponse.json({ success: true, count: 0, entries: [] });
      }
      throw err;
    }

    if (rows.length <= 1) {
      return NextResponse.json({ success: true, count: 0, entries: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const entries = dataRows
      .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
      .map((r, idx) => {
        const obj: Record<string, any> = { id: idx + 1 };
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

    return NextResponse.json({
      success: true,
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

    await ensureSheetWithHeaders(PIT_SHEET, PIT_HEADERS);

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
      String(data.robotType || '').trim(),
    ];

    const result = await appendRows(PIT_SHEET, [row], 'RAW');

    return NextResponse.json({
      success: true,
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
