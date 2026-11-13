import { NextResponse } from 'next/server';

const FTCSCOUT_GRAPHQL_URL = 'https://api.ftcscout.org/graphql';

const SEARCH_EVENTS_QUERY = `
  query SearchEvents($season: Int!, $searchText: String, $region: RegionOption, $limit: Int) {
    eventsSearch(season: $season, searchText: $searchText, region: $region, limit: $limit) {
      code
      name
      regionCode
      start
    }
  }
`;

const EVENT_BY_CODE_QUERY = `
  query EventMatches($season: Int!, $code: String!) {
    eventByCode(season: $season, code: $code) {
      code
      name
      season
      regionCode
      start
      matches {
        id
        matchNum
        tournamentLevel
        teams {
          teamNumber
          alliance
          station
        }
      }
    }
  }
`;

async function queryFTCScout(query: string, variables: Record<string, unknown>) {
  const res = await fetch(FTCSCOUT_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al consultar FTCScout`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message || 'Error en consulta GraphQL de FTCScout');
  }
  return json.data;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'matches';
    const season = parseInt(searchParams.get('season') || '2026', 10);

    if (action === 'search') {
      const q = searchParams.get('q')?.trim() || undefined;
      const region = searchParams.get('region')?.trim() || undefined;
      const data = await queryFTCScout(SEARCH_EVENTS_QUERY, {
        season,
        searchText: q,
        region: region || null,
        limit: 15,
      });

      return NextResponse.json({
        success: true,
        events: data.eventsSearch || [],
      });
    }

    const code = searchParams.get('code')?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el código del evento (code)' },
        { status: 400 }
      );
    }

    const data = await queryFTCScout(EVENT_BY_CODE_QUERY, { season, code });
    const event = data.eventByCode;

    if (!event) {
      return NextResponse.json(
        { success: false, error: `No se encontró el evento ${code} en la temporada ${season}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        code: event.code,
        name: event.name,
        season: event.season,
        regionCode: event.regionCode,
        start: event.start,
      },
      matches: event.matches || [],
    });
  } catch (error: any) {
    console.error('Error en /api/event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener datos del evento' },
      { status: 500 }
    );
  }
}

