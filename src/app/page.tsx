'use client';

import React, { useEffect, useMemo, useState } from 'react';
import BiobuzzFieldSelector, {
  BLUE_START_ZONES,
  RED_START_ZONES,
} from '@/components/BiobuzzFieldSelector';
import NautilusNavMenu from '@/components/NautilusNavMenu';

type ScheduleTeam = {
  teamNumber: number;
  alliance: 'Red' | 'Blue';
  station: 'One' | 'Two';
};

type ScheduleMatch = {
  id: number;
  matchNum: number;
  tournamentLevel: string;
  teams: ScheduleTeam[];
};

type EventInfo = {
  code: string;
  name: string;
  season: number;
};

type StationLock = 'none' | 'Blue-One' | 'Blue-Two' | 'Red-One' | 'Red-Two';

const STORAGE_KEY = 'nautilus_4010_event_schedule_v1';

function CounterRow({
  title,
  subtitle,
  value,
  onDecrement,
  onIncrement,
  variant = 'gold',
}: {
  title: string;
  subtitle: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  variant?: 'gold' | 'danger';
}) {
  return (
    <div className="counter-split-row">
      <button type="button" className="counter-big-btn" onClick={onDecrement} aria-label={`Restar ${title}`}>
        −
      </button>

      <div className="counter-center-info">
        <div className="item-main-text">{title}</div>
        <div className="counter-center-value">{value}</div>
        <div className="item-sub-text">{subtitle}</div>
      </div>

      <button
        type="button"
        className={`counter-big-btn ${variant === 'danger' ? 'danger' : 'gold'}`}
        onClick={onIncrement}
        aria-label={`Sumar ${title}`}
      >
        +
      </button>
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  active,
  activeLabel,
  activeColor = '#10B981',
  onToggle,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  activeLabel: string;
  activeColor?: string;
  onToggle: () => void;
}) {
  return (
    <div
      className="open-row"
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div>
        <div className="item-main-text" style={{ color: active ? '#FFFFFF' : undefined }}>
          {title}
        </div>
        <div className="item-sub-text">{subtitle}</div>
      </div>
      <div
        style={{
          minWidth: '82px',
          padding: '9px 14px',
          borderRadius: '6px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 800,
          background: active ? `${activeColor}26` : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${active ? activeColor : 'rgba(255, 255, 255, 0.12)'}`,
          color: active ? activeColor : 'var(--nautilus-gray)',
          flexShrink: 0,
        }}
      >
        {active ? activeLabel : 'NO'}
      </div>
    </div>
  );
}

export default function MatchScoutingPage() {
  // Metadatos
  const [alliance, setAlliance] = useState<'blue' | 'red'>('blue');
  const [match, setMatch] = useState(1);
  const [team, setTeam] = useState(4010);
  const [scouter, setScouter] = useState('');
  const [currentTab, setCurrentTab] = useState<'auto' | 'teleop' | 'endgame'>('auto');

  // Evento y Schedule (FTCScout)
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [scheduleMatches, setScheduleMatches] = useState<ScheduleMatch[]>([]);
  const [lockedStation, setLockedStation] = useState<StationLock>('none');
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchSeason, setSearchSeason] = useState(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ code: string; name: string; regionCode: string; start: string }[]>([]);
  const [searchingEvents, setSearchingEvents] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);

  // AUTO (30s)
  const [startPos, setStartPos] = useState<string>(BLUE_START_ZONES[0].id);
  const [autoLeave, setAutoLeave] = useState(false);
  const [autoPark, setAutoPark] = useState(false);
  const [autoHiveTips, setAutoHiveTips] = useState(0);
  const [autoPollen, setAutoPollen] = useState(0);
  const [autoNectar, setAutoNectar] = useState(0);

  // TELEOP (2m)
  const [teleopHiveTips, setTeleopHiveTips] = useState(0);
  const [flowerPollen, setFlowerPollen] = useState(0);
  const [flowerNectar, setFlowerNectar] = useState(0);
  const [bottomNectar, setBottomNectar] = useState(false);
  const [flowerOwnership, setFlowerOwnership] = useState<'Controló Flor' | 'Perdió Control' | 'No compitió'>('No compitió');
  const [gardenElements, setGardenElements] = useState(0);
  const [gardenDescore, setGardenDescore] = useState(false);

  // ENDGAME (30s)
  const [teleopPark, setTeleopPark] = useState(false);
  const [robotStatus, setRobotStatus] = useState<'100% Operativo' | 'Falla Mecánica Parcial' | 'Desconectado/Inmóvil' | 'No se presentó'>('100% Operativo');
  const [minorFouls, setMinorFouls] = useState(0);
  const [majorFouls, setMajorFouls] = useState(0);
  const [cardStatus, setCardStatus] = useState<'Ninguna' | 'Amarilla' | 'Roja'>('Ninguna');
  const [driverSkill, setDriverSkill] = useState(3);
  const [tacticalNotes, setTacticalNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CÁLCULOS OFICIALES REGLAS BIOBUZZ (Tabla 10-2 y 10-4)
  const autoScore =
    (autoLeave ? 3 : 0) +
    (autoPark ? 5 : 0) +
    autoHiveTips * 20 +
    (autoPollen + autoNectar) * 2;

  const flowerMultiplier = flowerOwnership === 'Controló Flor' ? 2 : 0;
  const teleScore =
    teleopHiveTips * 20 +
    (flowerPollen + flowerNectar) * flowerMultiplier +
    (bottomNectar ? 5 : 0) +
    gardenElements * 1 +
    (teleopPark ? 5 : 0);

  const foulsScore = minorFouls * 5 + majorFouls * 20;
  const netScore = Math.max(0, autoScore + teleScore - foulsScore);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sincronizar startPos válido al cambiar de alianza
  useEffect(() => {
    const validZones = alliance === 'red' ? RED_START_ZONES : BLUE_START_ZONES;
    if (!validZones.some((z) => z.id === startPos)) {
      setStartPos(validZones[0].id);
    }
  }, [alliance, startPos]);

  // Cargar evento guardado en localStorage al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.eventInfo) setEventInfo(parsed.eventInfo);
        if (Array.isArray(parsed.matches)) setScheduleMatches(parsed.matches);
        if (parsed.lockedStation) setLockedStation(parsed.lockedStation);
      }
    } catch (e) {
      console.error('Error leyendo evento de localStorage:', e);
    }
  }, []);

  // Obtener el partido actual del schedule (priorizando Quals)
  const currentMatchSchedule = useMemo(() => {
    if (!scheduleMatches.length) return null;
    return (
      scheduleMatches.find((m) => m.matchNum === match && m.tournamentLevel === 'Quals') ||
      scheduleMatches.find((m) => m.matchNum === match) ||
      null
    );
  }, [scheduleMatches, match]);

  // Si el scouter fijó una estación (ej. Azul 1), autocompletar robot y alianza al cambiar de match
  useEffect(() => {
    if (!currentMatchSchedule || lockedStation === 'none') return;
    const [targetAlliance, targetStation] = lockedStation.split('-') as ['Blue' | 'Red', 'One' | 'Two'];
    const found = currentMatchSchedule.teams.find(
      (t) => t.alliance === targetAlliance && t.station === targetStation
    );
    if (found) {
      setTeam(found.teamNumber);
      setAlliance(found.alliance === 'Blue' ? 'blue' : 'red');
    }
  }, [currentMatchSchedule, lockedStation]);

  const persistEventData = (info: EventInfo | null, matches: ScheduleMatch[], station: StationLock) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ eventInfo: info, matches, lockedStation: station })
      );
    } catch (e) {
      console.error('Error guardando evento en localStorage:', e);
    }
  };

  const handleSearchEvents = async () => {
    setSearchingEvents(true);
    try {
      const params = new URLSearchParams({
        action: 'search',
        season: String(searchSeason),
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      const res = await fetch(`/api/event?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error buscando eventos');
      setSearchResults(json.events || []);
    } catch (err: any) {
      showToast(err.message || 'Error al buscar eventos');
    } finally {
      setSearchingEvents(false);
    }
  };

  const handleLoadEventByCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setLoadingEvent(true);
    try {
      const res = await fetch(`/api/event?season=${searchSeason}&code=${encodeURIComponent(cleanCode)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar el evento');
      }
      const info: EventInfo = {
        code: json.event.code,
        name: json.event.name,
        season: json.event.season,
      };
      const loadedMatches: ScheduleMatch[] = json.matches || [];
      setEventInfo(info);
      setScheduleMatches(loadedMatches);
      persistEventData(info, loadedMatches, lockedStation);
      setShowEventModal(false);
      showToast(`${info.code}: ${loadedMatches.length} partidos cargados`);
    } catch (err: any) {
      showToast(err.message || 'Error cargando evento');
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleStationChange = (station: StationLock) => {
    setLockedStation(station);
    persistEventData(eventInfo, scheduleMatches, station);
  };

  const handleClearEvent = () => {
    setEventInfo(null);
    setScheduleMatches([]);
    setLockedStation('none');
    localStorage.removeItem(STORAGE_KEY);
    setShowEventModal(false);
    showToast('Evento desconectado (modo manual)');
  };

  const handleResetForNextMatch = () => {
    setAutoLeave(false);
    setAutoPark(false);
    setAutoHiveTips(0);
    setAutoPollen(0);
    setAutoNectar(0);
    setTeleopHiveTips(0);
    setFlowerPollen(0);
    setFlowerNectar(0);
    setBottomNectar(false);
    setFlowerOwnership('No compitió');
    setGardenElements(0);
    setGardenDescore(false);
    setTeleopPark(false);
    setRobotStatus('100% Operativo');
    setMinorFouls(0);
    setMajorFouls(0);
    setCardStatus('Ninguna');
    setDriverSkill(3);
    setTacticalNotes('');
    setCurrentTab('auto');
  };

  const handleSubmit = async () => {
    if (!team) {
      showToast('Por favor ingresa un número de equipo');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        match,
        team,
        alliance: alliance === 'blue' ? 'AZUL' : 'ROJO',
        scouter: scouter.trim() || 'Scouter 4010',
        startPos,
        autoLeave,
        autoPark,
        autoHiveTips,
        autoPollen,
        autoNectar,
        teleopHiveTips,
        flowerPollen,
        flowerNectar,
        bottomNectar,
        flowerOwnership,
        gardenElements,
        gardenDescore,
        teleopPark,
        status: robotStatus,
        minorFouls,
        majorFouls,
        cardStatus,
        driverSkill,
        notes: tacticalNotes,
        autoScore,
        teleScore,
        foulsScore,
        netScore,
      };

      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al guardar en el servidor');
      }

      showToast(`Match #${match} (Robot #${team}) guardado`);
      setMatch((prev) => prev + 1);
      handleResetForNextMatch();
    } catch (err: any) {
      showToast(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{toastMessage}</span>
      </div>

      {/* Header Web Móvil */}
      <div className="fintech-header" style={{ padding: '8px 4px 14px 4px' }}>
        <NautilusNavMenu />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowEventModal(true)}
            className="dock-pill-btn"
            style={{
              padding: '7px 12px',
              fontSize: '11px',
              background: eventInfo ? 'rgba(237, 184, 36, 0.14)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: eventInfo ? 'rgba(237, 184, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)',
              color: eventInfo ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
            }}
            title="Configurar Evento de FTC"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{eventInfo ? eventInfo.code : 'Evento'}</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="header-action-icon"
            title="Guardar y Sincronizar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Alianza & Match Info */}
      <div className="action-dock" style={{ gap: '10px', padding: '0 0 18px 0' }}>
        <button
          onClick={() => setAlliance('blue')}
          className="dock-pill-btn"
          style={{
            background: alliance === 'blue' ? 'var(--alliance-blue-bg)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: alliance === 'blue' ? 'var(--alliance-blue-border)' : 'rgba(255, 255, 255, 0.08)',
            color: alliance === 'blue' ? '#93C5FD' : 'var(--nautilus-gray)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3B82F6' }}></span>
          <span>Alianza Azul</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '4px 12px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 700 }}>M#</span>
          <input
            type="number"
            value={match}
            onChange={(e) => setMatch(parseInt(e.target.value) || 1)}
            style={{
              width: '36px',
              background: 'transparent',
              border: 'none',
              color: 'var(--nautilus-white)',
              fontSize: '13px',
              fontWeight: 800,
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => setAlliance('red')}
          className="dock-pill-btn"
          style={{
            background: alliance === 'red' ? 'var(--alliance-red-bg)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: alliance === 'red' ? 'var(--alliance-red-border)' : 'rgba(255, 255, 255, 0.08)',
            color: alliance === 'red' ? '#FCA5A5' : 'var(--nautilus-gray)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }}></span>
          <span>Alianza Roja</span>
        </button>
      </div>

      {/* Robot Selector Rápido & Schedule del Match */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 700, textTransform: 'uppercase' }}>Robot:</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '4px 12px',
                gap: '4px',
              }}
            >
              <span style={{ color: 'var(--nautilus-gold)', fontWeight: 800 }}>#</span>
              <input
                type="number"
                value={team}
                onChange={(e) => setTeam(parseInt(e.target.value) || 0)}
                style={{
                  width: '60px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--nautilus-white)',
                  fontSize: '14px',
                  fontWeight: 800,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {!currentMatchSchedule && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {[4010, 4635, 12518].map((t) => (
                <button
                  key={t}
                  onClick={() => setTeam(t)}
                  style={{
                    background: team === t ? 'rgba(237, 184, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${team === t ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: team === t ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {currentMatchSchedule && (
            <span style={{ fontSize: '10px', color: 'var(--nautilus-gold)', fontWeight: 700 }}>
              {currentMatchSchedule.tournamentLevel} #{currentMatchSchedule.matchNum}
              {lockedStation !== 'none' ? ` • Fijo: ${lockedStation === 'Blue-One' ? 'A1' : lockedStation === 'Blue-Two' ? 'A2' : lockedStation === 'Red-One' ? 'R1' : 'R2'}` : ''}
            </span>
          )}
        </div>

        {/* Chips automáticos del Match desde FTCScout */}
        {currentMatchSchedule && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {['Blue-One', 'Blue-Two', 'Red-One', 'Red-Two'].map((slot) => {
              const [al, st] = slot.split('-') as ['Blue' | 'Red', 'One' | 'Two'];
              const entry = currentMatchSchedule.teams.find((t) => t.alliance === al && t.station === st);
              if (!entry) return null;
              const isBlue = al === 'Blue';
              const isSelected = team === entry.teamNumber && alliance === (isBlue ? 'blue' : 'red');
              const label = `${isBlue ? 'A' : 'R'}${st === 'One' ? '1' : '2'}`;

              return (
                <button
                  key={slot}
                  onClick={() => {
                    setTeam(entry.teamNumber);
                    setAlliance(isBlue ? 'blue' : 'red');
                  }}
                  style={{
                    background: isSelected
                      ? isBlue
                        ? 'var(--alliance-blue-bg)'
                        : 'var(--alliance-red-bg)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${
                      isSelected
                        ? isBlue
                          ? 'var(--alliance-blue-border)'
                          : 'var(--alliance-red-border)'
                        : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    borderRadius: '6px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: isBlue ? '#93C5FD' : '#FCA5A5',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isSelected ? '#FFFFFF' : 'var(--nautilus-gray)',
                    }}
                  >
                    #{entry.teamNumber}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA (Sin cajas, botones laterales grandes) */}
      <div className="fintech-content-section" style={{ padding: 0 }}>
        {/* ================= 1. PESTAÑA AUTÓNOMO ================= */}
        {currentTab === 'auto' && (
          <div className="open-list">
            {/* Posición Inicial (Mapa Interactivo BIOBUZZ 6x6) */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <BiobuzzFieldSelector
                alliance={alliance}
                value={startPos}
                teamNumber={team}
                onChange={setStartPos}
              />
            </div>

            <CounterRow
              title="Auto Hive Tips"
              subtitle="Panales volteados en auto"
              value={autoHiveTips}
              onDecrement={() => setAutoHiveTips(Math.max(0, autoHiveTips - 1))}
              onIncrement={() => setAutoHiveTips(autoHiveTips + 1)}
            />

            <CounterRow
              title="Piezas en Auto"
              subtitle="Polen o Néctar colocado"
              value={autoPollen}
              onDecrement={() => setAutoPollen(Math.max(0, autoPollen - 1))}
              onIncrement={() => setAutoPollen(autoPollen + 1)}
            />

            <ToggleRow
              title="Auto Leave"
              subtitle="Despegó del muro perimetral"
              active={autoLeave}
              activeLabel="SÍ"
              onToggle={() => setAutoLeave(!autoLeave)}
            />

            <ToggleRow
              title="Auto Park"
              subtitle="Aparcado en Loading Zone"
              active={autoPark}
              activeLabel="SÍ"
              onToggle={() => setAutoPark(!autoPark)}
            />
          </div>
        )}

        {/* ================= 2. PESTAÑA TELEOP ================= */}
        {currentTab === 'teleop' && (
          <div className="open-list">
            <CounterRow
              title="Hive Tips"
              subtitle="Meta: 4 y 7 TIPS para RP"
              value={teleopHiveTips}
              onDecrement={() => setTeleopHiveTips(Math.max(0, teleopHiveTips - 1))}
              onIncrement={() => setTeleopHiveTips(teleopHiveTips + 1)}
            />

            {/* Propiedad de la Flor */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Propiedad de la Flor</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gold)' }}>Néctar superior</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['Controló Flor', 'Perdió Control', 'No compitió'] as const).map((own) => (
                  <button
                    key={own}
                    onClick={() => setFlowerOwnership(own)}
                    className="btn-chip-duo"
                    style={{
                      background: flowerOwnership === own ? 'rgba(237, 184, 36, 0.18)' : undefined,
                      borderColor: flowerOwnership === own ? 'var(--nautilus-gold)' : undefined,
                      color: flowerOwnership === own ? 'var(--nautilus-gold)' : undefined,
                    }}
                  >
                    {own}
                  </button>
                ))}
              </div>
            </div>

            <CounterRow
              title="Polen en Flor"
              subtitle="Puntúa si se posee la flor"
              value={flowerPollen}
              onDecrement={() => setFlowerPollen(Math.max(0, flowerPollen - 1))}
              onIncrement={() => setFlowerPollen(flowerPollen + 1)}
            />

            <CounterRow
              title="Néctar en Flor"
              subtitle="Elementos de néctar depositados"
              value={flowerNectar}
              onDecrement={() => setFlowerNectar(Math.max(0, flowerNectar - 1))}
              onIncrement={() => setFlowerNectar(flowerNectar + 1)}
            />

            <ToggleRow
              title="Bottom Nectar Bonus"
              subtitle="Néctar más bajo en flor"
              active={bottomNectar}
              activeLabel="SÍ"
              activeColor="#EDB824"
              onToggle={() => setBottomNectar(!bottomNectar)}
            />

            <CounterRow
              title="Piezas en Garden"
              subtitle="Acumuladas en su jardín"
              value={gardenElements}
              onDecrement={() => setGardenElements(Math.max(0, gardenElements - 1))}
              onIncrement={() => setGardenElements(gardenElements + 1)}
            />

            <ToggleRow
              title="Defensa Garden (Descore)"
              subtitle="¿Robó/removió piezas rivales?"
              active={gardenDescore}
              activeLabel="SÍ"
              activeColor="#60A5FA"
              onToggle={() => setGardenDescore(!gardenDescore)}
            />
          </div>
        )}

        {/* ================= 3. PESTAÑA ENDGAME ================= */}
        {currentTab === 'endgame' && (
          <div className="open-list">
            <ToggleRow
              title="Endgame Park"
              subtitle="Aparcado al silbato final"
              active={teleopPark}
              activeLabel="SÍ"
              onToggle={() => setTeleopPark(!teleopPark)}
            />

            {/* Estatus de Operatividad del Robot */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Estatus del Robot</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>Filtro de confiabilidad</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['100% Operativo', 'Falla Mecánica Parcial', 'Desconectado/Inmóvil', 'No se presentó'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRobotStatus(st)}
                    className="btn-chip-duo"
                    style={{
                      background: robotStatus === st ? (st === '100% Operativo' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') : undefined,
                      borderColor: robotStatus === st ? (st === '100% Operativo' ? '#10B981' : '#EF4444') : undefined,
                      color: robotStatus === st ? '#FFFFFF' : undefined,
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <CounterRow
              title="Faltas Menores"
              subtitle="Puntos otorgados al rival"
              value={minorFouls}
              onDecrement={() => setMinorFouls(Math.max(0, minorFouls - 1))}
              onIncrement={() => setMinorFouls(minorFouls + 1)}
              variant="danger"
            />

            <CounterRow
              title="Faltas Graves"
              subtitle="Interferencias mayores (G417)"
              value={majorFouls}
              onDecrement={() => setMajorFouls(Math.max(0, majorFouls - 1))}
              onIncrement={() => setMajorFouls(majorFouls + 1)}
              variant="danger"
            />

            {/* Tarjetas Amarilla / Roja */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Tarjetas de Arbitraje</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>2 amarillas = DQ</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['Ninguna', 'Amarilla', 'Roja'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCardStatus(c)}
                    className="btn-chip-duo"
                    style={{
                      background: cardStatus === c ? (c === 'Amarilla' ? 'rgba(234, 179, 8, 0.25)' : c === 'Roja' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)') : undefined,
                      borderColor: cardStatus === c ? (c === 'Amarilla' ? '#EAB308' : c === 'Roja' ? '#EF4444' : 'rgba(255, 255, 255, 0.3)') : undefined,
                      color: cardStatus === c ? '#FFFFFF' : undefined,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Skill Rating */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Habilidad del Piloto (1 a 5)</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--nautilus-gold)' }}>★ {driverSkill} / 5</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDriverSkill(num)}
                    className="btn-chip-duo"
                    style={{
                      background: driverSkill === num ? 'var(--nautilus-gold)' : undefined,
                      borderColor: driverSkill === num ? 'var(--nautilus-gold)' : undefined,
                      color: driverSkill === num ? '#010124' : undefined,
                      fontSize: '15px',
                      fontWeight: 800,
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas Tácticas */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <label className="input-duo-label">Notas Tácticas Breves</label>
              <input
                type="text"
                placeholder="Ej. Se atora en bordes, intake rápido..."
                value={tacticalNotes}
                onChange={(e) => setTacticalNotes(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Botón Principal de Guardar al finalizar Endgame */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="dock-pill-btn"
              style={{
                marginTop: '14px',
                background: 'var(--nautilus-gold)',
                borderColor: 'var(--nautilus-gold)',
                color: '#010124',
                fontWeight: 800,
                fontSize: '15px',
                padding: '15px 20px',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Guardando...' : `Guardar Match #${match}`}
            </button>
          </div>
        )}
      </div>

      {/* Modal Glassmorphic de Evento FTCScout */}
      {showEventModal && (
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
          onClick={() => setShowEventModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#07072B',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  Evento FTC (Schedule)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>
                  Autocompleta equipos y alianzas por match
                </div>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="header-action-icon"
                style={{ width: '32px', height: '32px' }}
              >
                ✕
              </button>
            </div>

            {eventInfo && (
              <div
                style={{
                  background: 'rgba(237, 184, 36, 0.1)',
                  border: '1px solid rgba(237, 184, 36, 0.35)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--nautilus-gold)' }}>
                    {eventInfo.code} ({eventInfo.season})
                  </div>
                  <div style={{ fontSize: '11px', color: '#FFFFFF' }}>{eventInfo.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                    {scheduleMatches.length} partidos en memoria
                  </div>
                </div>
                <button
                  onClick={handleClearEvent}
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(248, 113, 113, 0.4)',
                    color: '#FCA5A5',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Quitar
                </button>
              </div>
            )}

            {/* Estación fija del Scouter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nautilus-gray)', textTransform: 'uppercase' }}>
                Estación fija del scouter (opcional)
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
                    onClick={() => handleStationChange(st.id)}
                    style={{
                      background:
                        lockedStation === st.id
                          ? st.id.startsWith('Blue')
                            ? 'var(--alliance-blue-bg)'
                            : st.id.startsWith('Red')
                              ? 'var(--alliance-red-bg)'
                              : 'rgba(237, 184, 36, 0.18)'
                          : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${
                        lockedStation === st.id ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      color: lockedStation === st.id ? '#FFFFFF' : 'var(--nautilus-gray)',
                      borderRadius: '6px',
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

            {/* Temporada + Búsqueda / Código */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[2026, 2025, 2024].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSearchSeason(yr)}
                    style={{
                      flex: 1,
                      background: searchSeason === yr ? 'rgba(237, 184, 36, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${searchSeason === yr ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: searchSeason === yr ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
                      borderRadius: '6px',
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
                  placeholder="Buscar nombre o código (ej. Mexico, MXCMP)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchEvents();
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSearchEvents}
                  disabled={searchingEvents}
                  className="dock-pill-btn"
                  style={{
                    flex: 'none',
                    padding: '10px 14px',
                    background: 'var(--nautilus-gold)',
                    color: '#010124',
                    borderColor: 'var(--nautilus-gold)',
                    fontSize: '12px',
                  }}
                >
                  {searchingEvents ? '...' : 'Buscar'}
                </button>
              </div>

              {searchQuery.trim().length >= 3 && (
                <button
                  onClick={() => handleLoadEventByCode(searchQuery)}
                  disabled={loadingEvent}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(237, 184, 36, 0.4)',
                    borderRadius: '6px',
                    padding: '8px',
                    color: 'var(--nautilus-gold)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {loadingEvent ? 'Cargando...' : `Cargar directo por código "${searchQuery.trim().toUpperCase()}"`}
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {searchResults.map((ev) => (
                  <button
                    key={ev.code}
                    onClick={() => handleLoadEventByCode(ev.code)}
                    disabled={loadingEvent}
                    style={{
                      textAlign: 'left',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>{ev.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                        {ev.code} • {ev.regionCode} • {ev.start}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--nautilus-gold)' }}>Elegir →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Barra inferior de fases del Match: Autónomo / TeleOp / Endgame */}
      <nav className="bottom-nav" aria-label="Fases del Match">
        <button
          type="button"
          onClick={() => setCurrentTab('auto')}
          className={`nav-link ${currentTab === 'auto' ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
            <path d="M9 15h6" />
          </svg>
          <span>Autónomo</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('teleop')}
          className={`nav-link ${currentTab === 'teleop' ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="3" />
            <path d="M6 12h4m-2-2v4" />
            <circle cx="17" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="14" r="1" fill="currentColor" />
          </svg>
          <span>TeleOp</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('endgame')}
          className={`nav-link ${currentTab === 'endgame' ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <span>Endgame</span>
        </button>
      </nav>
    </>
  );
}
