import { NextResponse } from 'next/server';
import {
  appendScoutRow,
  ensureSheetWithHeaders,
  invalidateEnsuredSheet,
} from '@/lib/googleSheets';
import {
  SCOUT_HEADERS,
  getMatchSheetName,
  normalizeEventCode,
} from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const eventCode = normalizeEventCode(data?.eventCode ?? data?.event);
    const sheetName = getMatchSheetName(eventCode);

    const timestamp =
      typeof data.timestamp === 'string' && data.timestamp.trim()
        ? data.timestamp.trim()
        : new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });

    const notesText = data.notes
      ? `${data.notes} ${data.tags && data.tags.length ? '[' + data.tags.join(', ') + ']' : ''}`.trim()
      : (data.tags && data.tags.length ? '[' + data.tags.join(', ') + ']' : '');

    // Orden cronológico exacto coincidente con Captura_BIOBUZZ!A1:AE1 (31 columnas)
    const row = [
      timestamp,                                // A: Timestamp
      Number(data.match) || 0,                  // B: Match #
      Number(data.team) || 0,                   // C: Equipo #
      (data.alliance || 'AZUL').toUpperCase(),  // D: Alianza
      data.scouter || 'Scouter 4010',           // E: Scouter
      data.startPos || 'Sin pos.',              // F: Posición Inicio
      data.autoLeave ? 'SI' : 'NO',             // G: Auto Leave
      data.autoPark ? 'SI' : 'NO',              // H: Auto Park
      Number(data.autoHivePollen ?? 0),         // I: Auto Balancín Polen
      Number(data.autoHiveNectar ?? 0),         // J: Auto Balancín Néctar
      Number(data.autoFlowerPollen ?? 0),       // K: Auto Flor Polen
      Number(data.autoFlowerNectar ?? 0),       // L: Auto Flor Néctar
      Number(data.teleopHivePollen ?? 0),       // M: TeleOp Balancín Polen
      Number(data.teleopHiveNectar ?? 0),       // N: TeleOp Balancín Néctar
      (() => {
        const raw = data.flowerOwner ?? data.flowerOwnership;
        if (raw === '' || raw === null || raw === undefined) return 0;
        const n = Number(raw);
        return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : String(raw);
      })(),                                                                 // O: Propiedad Flor (0-4)
      Number(data.flowerPollen ?? 0),           // P: TeleOp Flor Polen
      Number(data.flowerNectar ?? 0),           // Q: TeleOp Flor Néctar
      data.bottomNectar ? 'SI' : 'NO',          // R: Bottom Nectar
      Number(data.gardenElements ?? 0),         // S: Garden Piezas
      data.gardenDescore ? 'SI' : 'NO',         // T: Defensa Garden
      data.teleopPark ? 'SI' : 'NO',            // U: Endgame Park
      data.status || '100% Operativo',          // V: Estatus Robot
      Number(data.minorFouls ?? 0),             // W: Faltas Menores
      Number(data.majorFouls ?? 0),             // X: Faltas Graves
      data.cardStatus || 'Ninguna',             // Y: Tarjetas
      Number(data.driverRating ?? data.driverSkill ?? 3), // Z: Piloto (1-5)
      notesText,                                // AA: Notas
      Number(data.autoScore ?? 0),              // AB: Auto Pts
      Number(data.teleScore ?? 0),              // AC: TeleOp Pts
      Number(data.foulsScore ?? 0),             // AD: Faltas Pts
      Number(data.netScore ?? 0),               // AE: Puntos Netos
    ];

    await ensureSheetWithHeaders(sheetName, SCOUT_HEADERS);

    let result;
    try {
      result = await appendScoutRow(sheetName, row);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Unable to parse range')) {
        invalidateEnsuredSheet(sheetName);
        await ensureSheetWithHeaders(sheetName, SCOUT_HEADERS);
        result = await appendScoutRow(sheetName, row);
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      eventCode,
      sheetName,
      updatedRange: result.updates?.updatedRange,
    });
  } catch (error: any) {
    console.error('Error al guardar match en Sheets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar en Google Sheets' },
      { status: 500 }
    );
  }
}
