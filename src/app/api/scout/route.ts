import { NextResponse } from 'next/server';
import { appendScoutRow } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });

    const row = [
      timestamp,
      data.match || 0,
      data.team || 0,
      (data.alliance || 'AZUL').toUpperCase(),
      data.scouter || 'Anónimo',
      data.startPos || 'Pared Ext.',
      data.autoLeave ? 'SI' : 'NO',
      data.autoPark ? 'SI' : 'NO',
      data.autoHiveTips || 0,
      data.autoPieces || 0,
      data.teleopHiveTips || 0,
      data.flowerPollen || 0,
      data.flowerNectar || 0,
      data.bottomNectar ? 'SI' : 'NO',
      data.flowerOwner || 'No compitió',
      data.gardenElements || 0,
      data.gardenDescore ? 'SI' : 'NO',
      data.teleopPark ? 'SI' : 'NO',
      data.status || '100% Operativo',
      data.minorFouls || 0,
      data.majorFouls || 0,
      data.driverRating || 3,
      data.notes ? `${data.notes} ${data.tags && data.tags.length ? '[' + data.tags.join(', ') + ']' : ''}`.trim() : (data.tags && data.tags.length ? '[' + data.tags.join(', ') + ']' : ''),
      data.autoScore || 0,
      data.teleScore || 0,
      data.foulsScore || 0,
      data.netScore || 0,
    ];

    const result = await appendScoutRow('Captura_BIOBUZZ', row);

    return NextResponse.json({
      success: true,
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
