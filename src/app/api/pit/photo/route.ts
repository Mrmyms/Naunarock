import { NextResponse } from 'next/server';
import {
  appendRows,
  batchGetSheetRanges,
  ensureSheetWithHeaders,
  getSheetRows,
} from '@/lib/googleSheets';

export const runtime = 'nodejs';

const PIT_PHOTOS_SHEET = 'Pit_Fotos';
const MAX_CELL_CHARS = 45000;
const PIT_PHOTOS_HEADERS = [
  'Timestamp',
  'PHOTO_ID',
  'EQUIPO',
  'NOMBRE_ARCHIVO',
  'MIME_TYPE',
  'ETIQUETA',
  'PARTE',
  'TOTAL_PARTES',
  'TAMANO_BYTES',
  'DATA_CHUNK',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      photoId,
      teamNumber,
      fileName,
      mimeType,
      caption,
      totalParts,
      startPart,
      sizeBytes,
      parts,
    } = body ?? {};

    if (typeof photoId !== 'string' || !photoId.trim()) {
      return NextResponse.json(
        { success: false, error: 'photoId inválido o faltante' },
        { status: 400 }
      );
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un fragmento en parts' },
        { status: 400 }
      );
    }

    const totalPartsNum = Number(totalParts);
    const startPartNum = Number(startPart);
    if (
      !Number.isInteger(totalPartsNum) ||
      totalPartsNum < 1 ||
      !Number.isInteger(startPartNum) ||
      startPartNum < 1
    ) {
      return NextResponse.json(
        { success: false, error: 'totalParts y startPart deben ser enteros >= 1' },
        { status: 400 }
      );
    }

    for (const part of parts) {
      if (typeof part !== 'string' || part.length === 0 || part.length > MAX_CELL_CHARS + 3000) {
        return NextResponse.json(
          { success: false, error: 'Cada fragmento debe ser una cadena válida <= 48000 caracteres' },
          { status: 400 }
        );
      }
    }

    await ensureSheetWithHeaders(PIT_PHOTOS_SHEET, PIT_PHOTOS_HEADERS);

    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
    const cleanPhotoId = photoId.trim();

    const rows: (string | number)[][] = parts.map((part: string, idx: number) => [
      timestamp,
      cleanPhotoId,
      Number(teamNumber) || 0,
      String(fileName || 'photo'),
      String(mimeType || 'application/octet-stream'),
      String(caption || ''),
      startPartNum + idx,
      totalPartsNum,
      Number(sizeBytes) || 0,
      part,
    ]);

    // Usar RAW evita que fragmentos Base64 que inicien con '+' o '=' se evalúen como fórmulas
    await appendRows(PIT_PHOTOS_SHEET, rows, 'RAW');

    return NextResponse.json({
      success: true,
      photoId: cleanPhotoId,
      partsSaved: rows.length,
    });
  } catch (error: any) {
    console.error('Error guardando foto de Pit en Sheets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar foto en Google Sheets' },
      { status: 500 }
    );
  }
}

type PhotoChunkMatch = {
  rowNum: number;
  part: number;
  totalParts: number;
  mimeType: string;
  fileName: string;
  chunk?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el parámetro id' },
        { status: 400 }
      );
    }

    let metaRows: any[][];
    try {
      metaRows = await getSheetRows(PIT_PHOTOS_SHEET, 'A2:I50000');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Unable to parse range')) {
        return NextResponse.json(
          { success: false, error: 'Foto no encontrada' },
          { status: 404 }
        );
      }
      throw err;
    }

    const matches: PhotoChunkMatch[] = [];
    metaRows.forEach((row, idx) => {
      if (String(row[1] || '').trim() === id) {
        matches.push({
          rowNum: idx + 2,
          part: Number(row[6]) || 0,
          totalParts: Number(row[7]) || 1,
          mimeType: String(row[4] || 'application/octet-stream'),
          fileName: String(row[3] || 'photo'),
        });
      }
    });

    if (matches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Foto no encontrada' },
        { status: 404 }
      );
    }

    matches.sort((a, b) => a.rowNum - b.rowNum);

    // Agrupar filas contiguas para minimizar el número de rangos en batchGet
    const runs: { startRow: number; endRow: number; items: PhotoChunkMatch[] }[] = [];
    for (const item of matches) {
      const lastRun = runs[runs.length - 1];
      if (lastRun && item.rowNum === lastRun.endRow + 1) {
        lastRun.endRow = item.rowNum;
        lastRun.items.push(item);
      } else {
        runs.push({ startRow: item.rowNum, endRow: item.rowNum, items: [item] });
      }
    }

    const ranges = runs.map((r) => `${PIT_PHOTOS_SHEET}!J${r.startRow}:J${r.endRow}`);
    const valueRanges = await batchGetSheetRanges(ranges);

    runs.forEach((run, runIdx) => {
      const values = valueRanges[runIdx]?.values || [];
      run.items.forEach((item, offset) => {
        item.chunk = String(values[offset]?.[0] ?? '');
      });
    });

    matches.sort((a, b) => a.part - b.part);

    const expectedTotal = matches[0].totalParts;
    if (matches.length < expectedTotal || matches.some((m) => !m.chunk)) {
      return NextResponse.json(
        { success: false, error: 'La foto está incompleta en Google Sheets' },
        { status: 500 }
      );
    }

    const base64Joined = matches.map((m) => m.chunk || '').join('');
    const buffer = Buffer.from(base64Joined, 'base64');
    const safeFileName = (matches[0].fileName || 'photo').replace(/["\\\r\n]/g, '_');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': matches[0].mimeType,
        'Content-Disposition': `inline; filename="${safeFileName}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error al leer foto de Pit:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener la foto' },
      { status: 500 }
    );
  }
}
