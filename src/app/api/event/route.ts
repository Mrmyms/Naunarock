import { NextResponse } from 'next/server';

const FTCSCOUT_GRAPHQL_URL = 'https://api.ftcscout.org/graphql';

type FTCScoutEventSummary = {
  code: string;
  name: string;
  regionCode: string;
  start: string;
};

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

const EVENT_SUMMARY_BY_CODE_QUERY = `
  query EventSummary($season: Int!, $code: String!) {
    eventByCode(season: $season, code: $code) {
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

function normalizeText(str: string): string {
  return str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

async function safeEventSummaryByCode(
  season: number,
  code: string
): Promise<FTCScoutEventSummary | null> {
  try {
    const data = await queryFTCScout(EVENT_SUMMARY_BY_CODE_QUERY, { season, code });
    return data?.eventByCode || null;
  } catch {
    return null;
  }
}

function dedupeEvents(list: FTCScoutEventSummary[]): FTCScoutEventSummary[] {
  const seen = new Set<string>();
  const result: FTCScoutEventSummary[] = [];
  for (const ev of list) {
    if (!ev?.code || seen.has(ev.code)) continue;
    seen.add(ev.code);
    result.push(ev);
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'matches';
    const season = parseInt(searchParams.get('season') || '2026', 10);

    if (action === 'search') {
      const q = searchParams.get('q')?.trim() || '';
      const rawRegion = searchParams.get('region')?.trim().toUpperCase() || '';
      const region = rawRegion && rawRegion !== 'ALL' ? rawRegion : '';
      const looksLikeCode = /^[A-Za-z0-9_-]{3,16}$/.test(q);
      const qNorm = normalizeText(q);

      if (region) {
        const [regionData, exactEvent] = await Promise.all([
          queryFTCScout(SEARCH_EVENTS_QUERY, {
            season,
            searchText: null,
            region,
            limit: 50,
          }),
          looksLikeCode ? safeEventSummaryByCode(season, q.toUpperCase()) : Promise.resolve(null),
        ]);

        const regionEvents: FTCScoutEventSummary[] = (regionData?.eventsSearch || [])
          .slice()
          .sort((a: FTCScoutEventSummary, b: FTCScoutEventSummary) =>
            String(a.start || '').localeCompare(String(b.start || ''))
          );

        const filtered = qNorm
          ? regionEvents.filter((ev) => {
              const haystack = normalizeText(`${ev.code} ${ev.name} ${ev.regionCode}`);
              return haystack.includes(qNorm);
            })
          : regionEvents;

        const combined = dedupeEvents([
          ...(exactEvent ? [exactEvent] : []),
          ...filtered,
        ]);

        return NextResponse.json({
          success: true,
          events: combined,
        });
      }

      const [globalData, exactEvent, mxData] = await Promise.all([
        queryFTCScout(SEARCH_EVENTS_QUERY, {
          season,
          searchText: q || null,
          region: null,
          limit: 20,
        }),
        looksLikeCode ? safeEventSummaryByCode(season, q.toUpperCase()) : Promise.resolve(null),
        qNorm === 'mexico'
          ? queryFTCScout(SEARCH_EVENTS_QUERY, {
              season,
              searchText: null,
              region: 'MX',
              limit: 50,
            })
          : Promise.resolve(null),
      ]);

      const combined = dedupeEvents([
        ...(exactEvent ? [exactEvent] : []),
        ...(mxData?.eventsSearch || []),
        ...(globalData?.eventsSearch || []),
      ]);

      return NextResponse.json({
        success: true,
        events: combined,
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
