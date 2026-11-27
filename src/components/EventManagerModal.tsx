'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AvailableSheetEvent, normalizeEventCode } from '@/lib/events';
import { SavedEventSession, ScheduleMatch, StationLock } from '@/lib/eventStore';

interface EventManagerModalProps {
  open: boolean;
  onClose: () => void;
  savedEvents: SavedEventSession[];
  activeEventCode: string;
  sheetPreviewPrefix: 'Captura_BIOBUZZ' | 'Pit_BIOBUZZ';
  showStationLock?: boolean;
  lockedStation?: StationLock;
  availableSheetEvents?: AvailableSheetEvent[];
  onSelectEvent: (code: string) => void;
  onAddOrUpdateEvent: (session: SavedEventSession) => void;
  onRemoveEvent: (code: string) => void;
  onStationChange?: (station: StationLock) => void;
  onToast?: (msg: string) => void;
}

type SearchResultEvent = {
  code: string;
  name: string;
  regionCode: string;
  start: string;
};

function normalizeSearchText(str: string): string {
  return str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function EventManagerModal({
  open,
  onClose,
  savedEvents,
  activeEventCode,
  sheetPreviewPrefix,
  showStationLock = false,
  lockedStation = 'none',
  availableSheetEvents = [],
  onSelectEvent,
  onAddOrUpdateEvent,
  onRemoveEvent,
  onStationChange,
  onToast,
}: EventManagerModalProps) {
  const [searchSeason, setSearchSeason] = useState(2026);
  const [searchRegion, setSearchRegion] = useState<'MX' | 'ALL'>('MX');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultEvent[]>([]);
  const [searchingEvents, setSearchingEvents] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  const searchSeqRef = useRef(0);

  const normalizedManualCode = useMemo(() => normalizeEventCode(searchQuery), [searchQuery]);
  const savedCodesSet = useMemo(() => new Set(savedEvents.map((e) => e.code)), [savedEvents]);

  const unjoinedSheetEvents = useMemo(() => {
    return availableSheetEvents.filter(
      (ev) => !ev.isDefault && ev.code && !savedCodesSet.has(ev.code)
    );
  }, [availableSheetEvents, savedCodesSet]);

  const fetchEventsFromFTCScout = async (opts?: {
    season?: number;
    region?: 'MX' | 'ALL';
    q?: string;
  }) => {
    const seq = ++searchSeqRef.current;
    const targetSeason = opts?.season ?? searchSeason;
    const targetRegion = opts?.region ?? searchRegion;
    const targetQuery = (opts?.q ?? searchQuery).trim();

    setSearchingEvents(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({
        action: 'search',
        season: String(targetSeason),
        region: targetRegion,
      });
      if (targetQuery) {
        params.set('q', targetQuery);
      }
      const res = await fetch(`/api/event?${params.toString()}`);
      const json = await res.json();
      if (seq !== searchSeqRef.current) return;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error buscando eventos');
      }
      setSearchResults(json.events || []);
      setHasSearched(true);
    } catch (err: any) {
      if (seq !== searchSeqRef.current) return;
      const msg = err.message || 'Error al buscar eventos';
      setSearchError(msg);
      setHasSearched(true);
    } finally {
      if (seq === searchSeqRef.current) {
        setSearchingEvents(false);
      }
    }
  };

  // Auto-cargar eventos de México al abrir o cambiar temporada/región MX
  useEffect(() => {
    if (!open) return;
    if (searchRegion === 'MX') {
      void fetchEventsFromFTCScout({ season: searchSeason, region: 'MX', q: '' });
    } else {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchSeason, searchRegion]);

  // Filtrado instantáneo en cliente cuando está en modo México
  const visibleResults = useMemo(() => {
    if (searchRegion !== 'MX') return searchResults;
    const qNorm = normalizeSearchText(searchQuery);
    if (!qNorm) return searchResults;
    return searchResults.filter((ev) => {
      const haystack = normalizeSearchText(`${ev.code} ${ev.name} ${ev.regionCode}`);
      return haystack.includes(qNorm);
    });
  }, [searchRegion, searchResults, searchQuery]);

  if (!open) return null;

  const handleSearchEvents = async () => {
    await fetchEventsFromFTCScout({
      season: searchSeason,
      region: searchRegion,
      q: searchRegion === 'MX' ? '' : searchQuery,
    });
  };

  const handleLoadEventByCode = async (rawCode: string) => {
    const cleanCode = normalizeEventCode(rawCode);
    if (!cleanCode) {
      onToast?.('Ingresa un código de evento válido');
      return;
    }

    setLoadingEvent(true);
    try {
      const res = await fetch(
        `/api/event?season=${searchSeason}&code=${encodeURIComponent(cleanCode)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar el evento');
      }

      const existing = savedEvents.find((e) => e.code === normalizeEventCode(json.event.code));
      const loadedMatches: ScheduleMatch[] = json.matches || [];
      const code = normalizeEventCode(json.event.code) || cleanCode;

      const session: SavedEventSession = {
        code,
        name: json.event.name || code,
        season: Number(json.event.season) || searchSeason,
        isManual: false,
        matches: loadedMatches,
        lockedStation: existing?.lockedStation ?? 'none',
        lastMatchNum: existing?.lastMatchNum ?? 1,
        updatedAt: new Date().toISOString(),
      };

      onAddOrUpdateEvent(session);
      onClose();
      onToast?.(`${code}: ${loadedMatches.length} partidos listos (${sheetPreviewPrefix}_${code})`);
    } catch (err: any) {
      onToast?.(err.message || 'Error cargando evento');
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleCreateManualEvent = (rawCode: string, displayName?: string) => {
    const cleanCode = normalizeEventCode(rawCode);
    if (!cleanCode) {
      onToast?.('Código inválido (usa letras/números, ej. MXMTY o DIV_A)');
      return;
    }

    const existing = savedEvents.find((e) => e.code === cleanCode);
    if (existing) {
      onSelectEvent(existing.code);
      onClose();
      onToast?.(`Evento activo: ${existing.code}`);
      return;
    }

    const session: SavedEventSession = {
      code: cleanCode,
      name: displayName?.trim() || `Evento ${cleanCode}`,
      season: searchSeason,
      isManual: true,
      matches: [],
      lockedStation: 'none',
      lastMatchNum: 1,
      updatedAt: new Date().toISOString(),
    };

    onAddOrUpdateEvent(session);
    onClose();
    onToast?.(`Evento ${cleanCode} agregado → ${sheetPreviewPrefix}_${cleanCode}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(1, 1, 20, 0.84)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#04042B',
          border: '2px solid #451F66',
          borderRadius: '6px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        {/* Header del Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #451F66',
            paddingBottom: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              Eventos Simultáneos
            </div>
            <div style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>
              Cada evento guarda en su propia hoja ({sheetPreviewPrefix}_CODIGO)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="header-action-icon"
            style={{ width: '32px', height: '32px' }}
          >
            ✕
          </button>
        </div>

        {/* 1. Eventos cargados en este dispositivo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nautilus-gray)', textTransform: 'uppercase' }}>
              Eventos en este dispositivo ({savedEvents.length})
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectEvent('');
                onClose();
              }}
              className="mono-tabular"
              style={{
                background: activeEventCode === '' ? '#451F66' : '#070733',
                border: activeEventCode === '' ? '1px solid #EDB824' : '1px solid #451F66',
                color: activeEventCode === '' ? '#EDB824' : 'var(--nautilus-gray)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              General ({sheetPreviewPrefix})
            </button>
          </div>

          {savedEvents.length === 0 ? (
            <div
              style={{
                background: '#070733',
                border: '1px dashed #451F66',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '11px',
                color: 'var(--nautilus-gray)',
              }}
            >
              Sin eventos específicos cargados. Actualmente se guarda en{' '}
              <strong style={{ color: '#EDB824' }}>{sheetPreviewPrefix}</strong>. Agrega 1 o más eventos abajo para separarlos en hojas distintas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {savedEvents.map((ev) => {
                const isActive = ev.code === activeEventCode;
                return (
                  <div
                    key={ev.code}
                    style={{
                      background: '#070733',
                      border: isActive ? '2px solid #EDB824' : '1px solid #451F66',
                      borderRadius: '4px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEvent(ev.code);
                        onClose();
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="mono-tabular" style={{ fontSize: '12px', fontWeight: 800, color: isActive ? '#EDB824' : '#FFFFFF' }}>
                          {ev.code}
                        </span>
                        <span
                          className="mono-tabular"
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 5px',
                            borderRadius: '3px',
                            background: '#010124',
                            border: '1px solid #451F66',
                            color: ev.isManual ? '#9CA3AF' : '#EDB824',
                          }}
                        >
                          {ev.isManual ? 'MANUAL' : ev.season}
                        </span>
                        {isActive && (
                          <span className="mono-tabular" style={{ fontSize: '9px', fontWeight: 800, color: '#10B981' }}>
                            ● ACTIVO
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#FFFFFF', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.name}
                      </div>
                      <div className="mono-tabular" style={{ fontSize: '10px', color: 'var(--nautilus-gray)', marginTop: '2px' }}>
                        Hoja: {sheetPreviewPrefix}_{ev.code}
                        {ev.matches.length > 0 ? ` • ${ev.matches.length} matches` : ''}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveEvent(ev.code)}
                      style={{
                        background: '#451F66',
                        border: '1px solid #EF4444',
                        color: '#FCA5A5',
                        borderRadius: '4px',
                        padding: '6px 9px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Eventos detectados en Google Sheets (para unirse con 1 toque) */}
        {unjoinedSheetEvents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nautilus-gray)', textTransform: 'uppercase' }}>
              Detectados en Google Sheets
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {unjoinedSheetEvents.map((ev) => (
                <button
                  key={ev.code}
                  type="button"
                  onClick={() => handleCreateManualEvent(ev.code, `Evento ${ev.code}`)}
                  className="mono-tabular"
                  style={{
                    background: '#070733',
                    border: '1px dashed #EDB824',
                    color: '#EDB824',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Unirse a {ev.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Estación fija del Scouter (por evento activo) */}
        {showStationLock && activeEventCode && onStationChange && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nautilus-gray)', textTransform: 'uppercase' }}>
              Estación fija en {activeEventCode} (opcional)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {(
                [
                  { id: 'none', label: 'Libre' },
                  { id: 'Blue-One', label: 'Azul 1' },
                  { id: 'Blue-Two', label: 'Azul 2' },
                  { id: 'Red-One', label: 'Rojo 1' },
                  { id: 'Red-Two', label: 'Rojo 2' },
                ] as { id: StationLock; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onStationChange(st.id)}
                  style={{
                    background: '#070733',
                    border: lockedStation === st.id ? '2px solid #EDB824' : '1px solid #451F66',
                    color: lockedStation === st.id ? '#EDB824' : 'var(--nautilus-gray)',
                    borderRadius: '4px',
                    padding: '8px 4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Buscar / Agregar evento (FTCScout MX, Global o Manual) */}
        <div
          style={{
            borderTop: '1px solid #451F66',
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EDB824', textTransform: 'uppercase' }}>
              Buscar o agregar evento
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(
                [
                  { id: 'MX', label: 'México (MX)' },
                  { id: 'ALL', label: 'Global' },
                ] as const
              ).map((reg) => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSearchRegion(reg.id)}
                  className="mono-tabular"
                  style={{
                    background: searchRegion === reg.id ? '#451F66' : '#070733',
                    border: searchRegion === reg.id ? '1px solid #EDB824' : '1px solid #451F66',
                    color: searchRegion === reg.id ? '#EDB824' : 'var(--nautilus-gray)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {reg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[2026, 2025, 2024].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSearchSeason(yr)}
                className="mono-tabular"
                style={{
                  flex: 1,
                  background: searchSeason === yr ? '#451F66' : '#070733',
                  border: searchSeason === yr ? '2px solid #EDB824' : '1px solid #451F66',
                  color: searchSeason === yr ? '#EDB824' : 'var(--nautilus-gray)',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {yr}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={
                searchRegion === 'MX'
                  ? 'Filtrar México (ej. Monterrey, MXTLQ, CDMX)'
                  : 'Buscar evento o código global (ej. CMP, USNM)'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchEvents();
              }}
              style={{
                flex: 1,
                background: '#070733',
                border: '1px solid #451F66',
                borderRadius: '4px',
                padding: '10px 12px',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSearchEvents}
              disabled={searchingEvents}
              className="dock-pill-btn"
              style={{
                flex: 'none',
                padding: '10px 14px',
                background: '#EDB824',
                color: '#010124',
                borderColor: '#EDB824',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {searchingEvents ? '...' : 'Buscar'}
            </button>
          </div>

          {normalizedManualCode.length >= 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleLoadEventByCode(searchQuery)}
                disabled={loadingEvent}
                className="mono-tabular"
                style={{
                  background: '#070733',
                  border: '1px dashed #EDB824',
                  borderRadius: '4px',
                  padding: '8px 6px',
                  color: '#EDB824',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loadingEvent ? 'Cargando...' : `FTCScout "${normalizedManualCode}"`}
              </button>

              <button
                type="button"
                onClick={() => handleCreateManualEvent(normalizedManualCode)}
                className="mono-tabular"
                style={{
                  background: '#451F66',
                  border: '1px solid #EDB824',
                  borderRadius: '4px',
                  padding: '8px 6px',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Manual "{normalizedManualCode}"
              </button>
            </div>
          )}

          {searchError && (
            <div
              className="mono-tabular"
              style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '8px 10px',
                color: '#FCA5A5',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {searchError}
            </div>
          )}

          {searchingEvents && visibleResults.length === 0 ? (
            <div
              className="mono-tabular"
              style={{
                background: '#070733',
                border: '1px solid #451F66',
                borderRadius: '4px',
                padding: '12px',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--nautilus-gray)',
              }}
            >
              Consultando eventos en FTCScout ({searchRegion === 'MX' ? 'México' : 'Global'} {searchSeason})...
            </div>
          ) : visibleResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '210px', overflowY: 'auto' }}>
              {visibleResults.map((ev) => {
                const isAlreadySaved = savedCodesSet.has(normalizeEventCode(ev.code));
                return (
                  <button
                    key={ev.code}
                    type="button"
                    onClick={() => handleLoadEventByCode(ev.code)}
                    disabled={loadingEvent}
                    style={{
                      textAlign: 'left',
                      background: '#070733',
                      border: isAlreadySaved ? '1px solid #EDB824' : '1px solid #451F66',
                      borderRadius: '4px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>{ev.name}</div>
                      <div className="mono-tabular" style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                        {ev.code} • {ev.regionCode} • {ev.start}
                      </div>
                    </div>
                    <span
                      className="mono-tabular"
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: isAlreadySaved ? '#10B981' : '#EDB824',
                        flexShrink: 0,
                      }}
                    >
                      {isAlreadySaved ? '✓ Cargado' : 'Agregar →'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : hasSearched && !searchError ? (
            <div
              style={{
                background: '#070733',
                border: '1px solid #451F66',
                borderRadius: '4px',
                padding: '12px',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--nautilus-gray)',
              }}
            >
              Sin resultados en FTCScout. Puedes usar{' '}
              <strong style={{ color: '#EDB824' }}>FTCScout &quot;CÓDIGO&quot;</strong> o{' '}
              <strong style={{ color: '#FFFFFF' }}>Manual &quot;CÓDIGO&quot;</strong> arriba.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
