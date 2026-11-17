'use client';

import React, { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener datos');
      }
      setMatches(data.matches || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // Aggregated team stats
  const teamStats: Record<string, { team: number; count: number; totalNet: number; totalBalancin: number; totalFlor: number; totalFouls: number }> = {};
  matches.forEach((m) => {
    const t = m['Equipo #'] || m['EQUIPO'] || m.team;
    if (!t) return;
    if (!teamStats[t]) {
      teamStats[t] = { team: Number(t), count: 0, totalNet: 0, totalBalancin: 0, totalFlor: 0, totalFouls: 0 };
    }
    teamStats[t].count += 1;

    const autoBalancin = Number(m['Auto Balancín Polen'] || 0) + Number(m['Auto Balancín Néctar'] || 0);
    const autoFlor = Number(m['Auto Flor Polen'] || 0) + Number(m['Auto Flor Néctar'] || 0);
    const teleBalancin = Number(m['TeleOp Balancín Polen'] || 0) + Number(m['TeleOp Balancín Néctar'] || 0);
    const teleFlor = Number(m['TeleOp Flor Polen'] || 0) + Number(m['TeleOp Flor Néctar'] || 0);

    const autoScore = Number(m['Auto Pts'] ?? 0);
    const teleScore = Number(m['TeleOp Pts'] ?? 0);
    const fouls = Number(m['Faltas Pts'] ?? 0);
    const net = Number(m['Puntos Netos'] ?? (autoScore + teleScore - fouls));

    teamStats[t].totalNet += net;
    teamStats[t].totalBalancin += autoBalancin + teleBalancin;
    teamStats[t].totalFlor += autoFlor + teleFlor;
    teamStats[t].totalFouls += fouls;
  });

  const rankedTeams = Object.values(teamStats).sort((a, b) => b.totalNet / b.count - a.totalNet / a.count);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--nautilus-white)', margin: 0, letterSpacing: '0.5px' }}>
            TELEMETRÍA EN VIVO
          </h1>
          <span style={{ fontSize: '11px', color: 'var(--nautilus-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Nautilus 4010 • Google Sheets
          </span>
        </div>
        <button
          onClick={fetchMatches}
          disabled={loading}
          className="btn-duo btn-duo-gold"
          style={{
            padding: '8px 14px',
            fontSize: '11px',
            borderRadius: '10px',
            borderBottomWidth: '3px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>{loading ? 'CARGANDO...' : 'ACTUALIZAR'}</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#3A1515',
            border: '2px solid var(--alliance-red)',
            borderBottom: '4px solid var(--alliance-red-shadow)',
            padding: '12px 14px',
            borderRadius: '12px',
            color: '#FCA5A5',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          [Error de conexión]: {error}
        </div>
      )}

      {/* KPI Cards (Chunky Duolingo 3D style) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card-duo">
          <span style={{ fontSize: '10px', color: 'var(--nautilus-gold)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.5px' }}>
            Matches Registrados
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 900, marginTop: '2px', color: 'var(--nautilus-white)' }}>
            {matches.length}
          </h2>
        </div>
        <div className="card-duo">
          <span style={{ fontSize: '10px', color: 'var(--nautilus-gold)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.5px' }}>
            Equipos Evaluados
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 900, marginTop: '2px', color: 'var(--nautilus-white)' }}>
            {rankedTeams.length}
          </h2>
        </div>
      </div>

      {/* EPA Rankings Table */}
      <div>
        <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--nautilus-gold)', marginBottom: '8px', letterSpacing: '0.5px' }}>
          Ranking por EPA Promedio (BIOBUZZ)
        </h3>
        <div
          className="card-duo"
          style={{
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {rankedTeams.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--nautilus-gray)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sin registros en la base de datos. Completa un formulario en la sección Match.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--nautilus-navy-card-border)',
                    color: 'var(--nautilus-gold)',
                    background: '#1A2342',
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Pos</th>
                  <th style={{ padding: '12px 8px' }}>Equipo</th>
                  <th style={{ padding: '12px 8px' }}>PJ</th>
                  <th style={{ padding: '12px 8px' }}>Bal/Flor</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>EPA Prom</th>
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
                        borderBottom: '1px solid var(--nautilus-navy-card-border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 900, color: idx === 0 ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 900, color: 'white' }}>
                        #{team.team}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--nautilus-gray)', fontWeight: 700 }}>
                        {team.count}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--nautilus-gold)', fontWeight: 800 }}>
                        {avgBal} / {avgFlor}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--nautilus-gold)' }}>
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
  );
}
