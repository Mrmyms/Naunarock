import { NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';

export async function GET() {
  try {
    const rows = await getSheetRows('Captura_BIOBUZZ', 'A1:AA1000');
    if (rows.length === 0) {
      return NextResponse.json({ success: true, headers: [], matches: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const matches = dataRows.map((r, idx) => {
      const obj: Record<string, any> = { id: idx + 1 };
      headers.forEach((h: string, colIdx: number) => {
        obj[h] = r[colIdx] ?? '';
      });
      return obj;
    });

    return NextResponse.json({
      success: true,
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
