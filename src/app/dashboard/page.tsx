'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import NautilusNavMenu from '@/components/NautilusNavMenu';
import {
  ALL_EVENTS_KEY,
  AvailableSheetEvent,
  DEFAULT_EVENT_KEY,
  getMatchSheetName,
} from '@/lib/events';
import { readEventCodeFromUrl, readEventStore } from '@/lib/eventStore';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<AvailableSheetEvent[]>([]);
  const [localEventCodes, setLocalEventCodes] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('Captura_BIOBUZZ');

  const fetchSeqRef = useRef(0);

  const fetchMatches = async (targetEvent: string | null) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      let url = '/api/data';
      if (targetEvent !== null) {
        const param = targetEvent === '' ? DEFAULT_EVENT_KEY : targetEvent;
        url = `/api/data?event=${encodeURIComponent(param)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (seq !== fetchSeqRef.current) return;
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener datos');
      }
      setMatches(data.matches || []);
      if (Array.isArray(data.availableEvents)) {
        setAvailableEvents(data.availableEvents);
      }
      if (typeof data.sheetName === 'string') {
        setActiveSheetName(data.sheetName);
      }
      if (targetEvent === null && typeof data.eventCode === 'string') {
        setSelectedEvent(data.eventCode);
      }
    } catch (err: any) {
      if (seq !== fetchSeqRef.current) return;
      setError(err.message);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const store = readEventStore();
    setLocalEventCodes(store.events.map((ev) => ev.code));

    const urlCode = readEventCodeFromUrl();
    const initialCode = urlCode || store.activeEventCode;

    if (initialCode) {
      setSelectedEvent(initialCode);
      setActiveSheetName(getMatchSheetName(initialCode));
      void fetchMatches(initialCode);
    } else {
      void fetchMatches(null);
    }
  }, []);

  const eventOptions = useMemo(() => {
    const options: { code: string; label: string }[] = [];
    const seen = new Set<string>();

    for (const ev of availableEvents) {
      if (!seen.has(ev.code)) {
        seen.add(ev.code);
        options.push({ code: ev.code, label: ev.label });
      }
    }

    for (const code of localEventCodes) {
      if (code && !seen.has(code)) {
        seen.add(code);
        options.push({ code, label: code });
      }
    }

    if (selectedEvent && selectedEvent !== ALL_EVENTS_KEY && !seen.has(selectedEvent)) {
      seen.add(selectedEvent);
      options.push({ code: selectedEvent, label: selectedEvent });
    }

    return options;
  }, [availableEvents, localEventCodes, selectedEvent]);

  const handleSelectEventFilter = (code: string) => {
    setSelectedEvent(code);
    setActiveSheetName(code === ALL_EVENTS_KEY ? 'Todos los eventos' : getMatchSheetName(code));
    void fetchMatches(code);
  };

  // Aggregated team stats
  const teamStats: Record<
    string,
    {
      team: number;
      count: number;
      totalNet: number;
      totalBalancin: number;
      totalFlor: number;
      totalFouls: number;
      events: Set<string>;
    }
  > = {};

  matches.forEach((m) => {
    const t = m['Equipo #'] || m['EQUIPO'] || m.team;
    if (!t) return;
    if (!teamStats[t]) {
      teamStats[t] = {
        team: Number(t),
        count: 0,
        totalNet: 0,
        totalBalancin: 0,
        totalFlor: 0,
        totalFouls: 0,
        events: new Set<string>(),
      };
    }
    teamStats[t].count += 1;
    teamStats[t].events.add(m._eventCode ? String(m._eventCode) : 'General');

    const autoBalancin =
      Number(m['AUTO HIVE POLLEN'] ?? m['Auto Balancín Polen'] ?? 0) +
      Number(m['AUTO HIVE NÉCTAR'] ?? m['Auto Balancín Néctar'] ?? 0);
    const autoFlor =
      Number(m['AUTO FLOR POLLEN'] ?? m['Auto Flor Polen'] ?? 0) +
      Number(m['AUTO FLOR NÉCTAR'] ?? m['Auto Flor Néctar'] ?? 0);
    const teleBalancin =
      Number(m['TELE HIVE POLLEN'] ?? m['TeleOp Balancín Polen'] ?? 0) +
      Number(m['TELE HIVE NÉCTAR'] ?? m['TeleOp Balancín Néctar'] ?? 0);
    const teleFlor =
      Number(m['TELE FLOR POLLEN'] ?? m['TeleOp Flor Polen'] ?? 0) +
      Number(m['TELE FLOR NÉCTAR'] ?? m['TeleOp Flor Néctar'] ?? 0);

    const autoScore = Number(m['Auto Pts'] ?? m['AUTO PTS'] ?? 0);
    const teleScore = Number(m['TeleOp Pts'] ?? m['TELEOP PTS'] ?? 0);
    const fouls = Number(m['Faltas Pts'] ?? m['FALTAS PTS'] ?? 0);
    const net = Number(m['Puntos Netos'] ?? m['PUNTOS NETOS'] ?? (autoScore + teleScore - fouls));

    teamStats[t].totalNet += net;
    teamStats[t].totalBalancin += autoBalancin + teleBalancin;
    teamStats[t].totalFlor += autoFlor + teleFlor;
    teamStats[t].totalFouls += fouls;
  });

  const rankedTeams = Object.values(teamStats).sort((a, b) => b.totalNet / b.count - a.totalNet / a.count);

  const subtitleLabel =
    selectedEvent === ALL_EVENTS_KEY
      ? 'Todos los eventos'
      : activeSheetName;

  return (
    <>
      {/* Header Nautilus Telemetría */}
      <div className="fintech-header" style={{ gap: '8px' }}>
        <NautilusNavMenu />

        <button
          type="button"
          onClick={() => fetchMatches(selectedEvent)}
          disabled={loading}
          className="dock-pill-btn mono-tabular"
          style={{
            flex: 'none',
            padding: '6px 10px',
            fontSize: '11px',
            background: '#451F66',
            borderColor: '#EDB824',
            color: '#FFFFFF',
            borderRadius: '4px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EDB824" strokeWidth="2.4">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Título de Sección */}
      <div style={{ marginBottom: '12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '0.3px' }}>
          TELEMETRÍA EN VIVO
        </h1>
        <span className="mono-tabular" style={{ fontSize: '11px', color: '#EDB824', fontWeight: 700, textTransform: 'uppercase' }}>
          Nautilus 4010 • Google Sheets ({subtitleLabel})
        </span>
      </div>

      {/* Selector de Evento */}
      {eventOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '12px',
          }}
        >
          {eventOptions.map((ev) => {
            const isCurrent = selectedEvent === ev.code;
            return (
              <button
                key={ev.code || DEFAULT_EVENT_KEY}
                type="button"
                onClick={() => handleSelectEventFilter(ev.code)}
                className="mono-tabular"
                style={{
                  flexShrink: 0,
                  background: isCurrent ? '#451F66' : '#070733',
                  border: isCurrent ? '1px solid #EDB824' : '1px solid #451F66',
                  color: isCurrent ? '#EDB824' : 'var(--nautilus-gray)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {ev.label}
              </button>
            );
          })}

          {eventOptions.length >= 2 && (
            <button
              type="button"
              onClick={() => handleSelectEventFilter(ALL_EVENTS_KEY)}
              className="mono-tabular"
              style={{
                flexShrink: 0,
                background: selectedEvent === ALL_EVENTS_KEY ? '#451F66' : '#070733',
                border: selectedEvent === ALL_EVENTS_KEY ? '1px solid #EDB824' : '1px solid #451F66',
                color: selectedEvent === ALL_EVENTS_KEY ? '#EDB824' : 'var(--nautilus-gray)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div
            className="mono-tabular"
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid #EF4444',
              borderRadius: '4px',
              padding: '10px 12px',
              color: '#FCA5A5',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Error de conexión: {error}
          </div>
        )}

        {/* KPI Cards (Estilo plano Nautilus) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="fintech-kpi-card" style={{ borderRadius: '4px', padding: '14px' }}>
            <div className="fintech-kpi-header" style={{ marginBottom: '6px' }}>
              <span
                className="fintech-kpi-title"
                style={{ fontSize: '10px', color: '#EDB824', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}
              >
                Matches Registrados
              </span>
            </div>
            <div className="fintech-kpi-value mono-tabular" style={{ fontSize: '30px', marginBottom: 0 }}>
              {matches.length}
            </div>
          </div>

          <div className="fintech-kpi-card" style={{ borderRadius: '4px', padding: '14px' }}>
            <div className="fintech-kpi-header" style={{ marginBottom: '6px' }}>
              <span
                className="fintech-kpi-title"
                style={{ fontSize: '10px', color: '#EDB824', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}
              >
                Equipos Evaluados
              </span>
            </div>
            <div className="fintech-kpi-value mono-tabular" style={{ fontSize: '30px', marginBottom: 0 }}>
              {rankedTeams.length}
            </div>
          </div>
        </div>

        {/* EPA Rankings Table */}
        <div>
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#EDB824',
              marginBottom: '8px',
              letterSpacing: '0.6px',
            }}
          >
            Ranking por EPA Promedio (BIOBUZZ)
          </h3>

          <div
            style={{
              background: '#070733',
              border: '1px solid #451F66',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {rankedTeams.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  color: 'var(--nautilus-gray)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {loading
                  ? 'Consultando registros en Google Sheets...'
                  : 'Sin registros para este evento. Completa un formulario en Match Scouting.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #451F66',
                      color: '#EDB824',
                      background: '#04042B',
                      textTransform: 'uppercase',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '10px 12px' }}>Pos</th>
                    <th style={{ padding: '10px 8px' }}>Equipo</th>
                    <th style={{ padding: '10px 8px' }}>PJ</th>
                    <th style={{ padding: '10px 8px' }}>Bal/Flor</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>EPA Prom</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedTeams.map((team, idx) => {
                    const avgNet = (team.totalNet / team.count).toFixed(1);
                    const avgBal = (team.totalBalancin / team.count).toFixed(1);
                    const avgFlor = (team.totalFlor / team.count).toFixed(1);
                    return (
                      <tr
                        key={team.team}
                        style={{
                          borderBottom: idx === rankedTeams.length - 1 ? 'none' : '1px solid rgba(69, 31, 102, 0.6)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        <td
                          className="mono-tabular"
                          style={{ padding: '11px 12px', fontWeight: 800, color: idx === 0 ? '#EDB824' : 'var(--nautilus-gray)' }}
                        >
                          {idx + 1}
                        </td>
                        <td className="mono-tabular" style={{ padding: '11px 8px', fontWeight: 800, color: '#FFFFFF' }}>
                          <div>#{team.team}</div>
                          {selectedEvent === ALL_EVENTS_KEY && (
                            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--nautilus-gray)' }}>
                              {Array.from(team.events).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="mono-tabular" style={{ padding: '11px 8px', color: 'var(--nautilus-gray)', fontWeight: 700 }}>
                          {team.count}
                        </td>
                        <td className="mono-tabular" style={{ padding: '11px 8px', color: '#FFFFFF', fontWeight: 700 }}>
                          {avgBal} / {avgFlor}
                        </td>
                        <td
                          className="mono-tabular"
                          style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 800, color: '#EDB824' }}
                        >
                          {avgNet}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
