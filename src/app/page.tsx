'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
const SCOUTER_STORAGE_KEY = 'nautilus_4010_scouter_v1';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function CounterRow({
  title,
  value,
  onDecrement,
  onIncrement,
  variant = 'gold',
}: {
  title: string;
  subtitle?: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  variant?: 'gold' | 'danger';
}) {
  const [flashing, setFlashing] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handlePlus = () => {
    if (typeof navigator !== 'undefined') {
      navigator.vibrate?.(30);
    }
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setFlashing(false);
    }, 150);
    onIncrement();
  };

  return (
    <div className={`counter-split-row ${flashing ? 'counter-row-flash' : ''}`}>
      <button type="button" className="counter-big-btn" onClick={onDecrement} aria-label={`Restar ${title}`}>
        −
      </button>

      <div className="counter-center-info">
        <div className="item-main-text">{title}</div>
        <div className="counter-center-value">{value}</div>
      </div>

      <button
        type="button"
        className={`counter-big-btn ${variant === 'danger' ? 'danger' : 'gold'}`}
        onClick={handlePlus}
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
        className="mono-tabular"
        style={{
          minWidth: '78px',
          padding: '8px 12px',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 800,
          background: active ? '#451F66' : '#070733',
          border: `1px solid ${active ? (activeColor === '#10B981' ? '#EDB824' : activeColor) : '#451F66'}`,
          color: active ? (activeColor === '#10B981' ? '#EDB824' : activeColor) : 'var(--nautilus-gray)',
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
  const [startPos, setStartPos] = useState<string>('');
  const [autoLeave, setAutoLeave] = useState(false);
  const [autoPark, setAutoPark] = useState(false);
  const [autoHivePollen, setAutoHivePollen] = useState(0);
  const [autoHiveNectar, setAutoHiveNectar] = useState(0);
  const [autoFlowerPollen, setAutoFlowerPollen] = useState(0);
  const [autoFlowerNectar, setAutoFlowerNectar] = useState(0);

  // TELEOP (2m)
  const [teleopHivePollen, setTeleopHivePollen] = useState(0);
  const [teleopHiveNectar, setTeleopHiveNectar] = useState(0);
  const [flowerPollen, setFlowerPollen] = useState(0);
  const [flowerNectar, setFlowerNectar] = useState(0);
  const [bottomNectar, setBottomNectar] = useState(false);
  const [flowerOwnership, setFlowerOwnership] = useState<'Controló Flor' | 'Perdió Control' | 'No compitió' | ''>('');
  const [gardenElements, setGardenElements] = useState(0);
  const [gardenDescore, setGardenDescore] = useState(false);

  // ENDGAME (30s)
  const [teleopPark, setTeleopPark] = useState(false);
  const [robotStatus, setRobotStatus] = useState<'100% Operativo' | 'Falla Mecánica Parcial' | 'Desconectado/Inmóvil' | 'No se presentó' | ''>('');
  const [minorFouls, setMinorFouls] = useState(0);
  const [majorFouls, setMajorFouls] = useState(0);
  const [cardStatus, setCardStatus] = useState<'Ninguna' | 'Amarilla' | 'Roja' | ''>('');
  const [driverSkill, setDriverSkill] = useState<number | null>(null);
  const [tacticalNotes, setTacticalNotes] = useState('');

  // UI state
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const missingItems = useMemo(() => {
    const items: { key: string; label: string; tab?: 'auto' | 'teleop' | 'endgame' }[] = [];
    if (!match || match < 1) items.push({ key: 'match', label: 'Match #' });
    if (!team || team < 1) items.push({ key: 'team', label: 'Robot #' });
    if (!startPos) items.push({ key: 'startPos', label: 'Posición de inicio', tab: 'auto' });
    if (!flowerOwnership) items.push({ key: 'flowerOwnership', label: 'Propiedad de la flor', tab: 'teleop' });
    if (!robotStatus) items.push({ key: 'robotStatus', label: 'Estatus del robot', tab: 'endgame' });
    if (!cardStatus) items.push({ key: 'cardStatus', label: 'Tarjetas', tab: 'endgame' });
    if (driverSkill === null) items.push({ key: 'driverSkill', label: 'Piloto (1–5)', tab: 'endgame' });
    if (!scouter.trim()) items.push({ key: 'scouter', label: 'Scouter', tab: 'endgame' });
    return items;
  }, [match, team, startPos, flowerOwnership, robotStatus, cardStatus, driverSkill, scouter]);

  const isFormComplete = missingItems.length === 0;

  // CÁLCULOS OFICIALES REGLAS BIOBUZZ (Tabla 10-2 y 10-4)
  const autoScore =
    (autoLeave ? 3 : 0) +
    (autoPark ? 5 : 0) +
    (autoHivePollen + autoHiveNectar + autoFlowerPollen + autoFlowerNectar) * 2;

  const flowerMultiplier = flowerOwnership === 'Controló Flor' ? 2 : 0;
  const teleScore =
    (teleopHivePollen + teleopHiveNectar) * 2 +
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
    if (!startPos) return;
    const validZones = alliance === 'red' ? RED_START_ZONES : BLUE_START_ZONES;
    if (!validZones.some((z) => z.id === startPos)) {
      setStartPos('');
    }
  }, [alliance, startPos]);

  // Cargar evento y scouter guardados en localStorage al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.eventInfo) setEventInfo(parsed.eventInfo);
        if (Array.isArray(parsed.matches)) setScheduleMatches(parsed.matches);
        if (parsed.lockedStation) setLockedStation(parsed.lockedStation);
      }
      const savedScouter = localStorage.getItem(SCOUTER_STORAGE_KEY);
      if (savedScouter) setScouter(savedScouter);
    } catch (e) {
      console.error('Error leyendo datos de localStorage:', e);
    }
    return () => {
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
    };
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
    setStartPos('');
    setAutoLeave(false);
    setAutoPark(false);
    setAutoHivePollen(0);
    setAutoHiveNectar(0);
    setAutoFlowerPollen(0);
    setAutoFlowerNectar(0);
    setTeleopHivePollen(0);
    setTeleopHiveNectar(0);
    setFlowerPollen(0);
    setFlowerNectar(0);
    setBottomNectar(false);
    setFlowerOwnership('');
    setGardenElements(0);
    setGardenDescore(false);
    setTeleopPark(false);
    setRobotStatus('');
    setMinorFouls(0);
    setMajorFouls(0);
    setCardStatus('');
    setDriverSkill(null);
    setTacticalNotes('');
    setShowValidation(false);
    setSaveError(null);
    setCurrentTab('auto');
  };

  const handleScouterChange = (val: string) => {
    setScouter(val);
    try {
      localStorage.setItem(SCOUTER_STORAGE_KEY, val);
    } catch {
      // ignore storage quota errors
    }
  };

  const handleSubmit = async () => {
    if (saveState === 'saving' || saveState === 'saved') return;

    if (!isFormComplete) {
      setShowValidation(true);
      const firstMissingTab = missingItems.find((m) => m.tab)?.tab;
      if (firstMissingTab && firstMissingTab !== currentTab) {
        setCurrentTab(firstMissingTab);
      }
      if (typeof navigator !== 'undefined') {
        navigator.vibrate?.([20, 40, 20]);
      }
      return;
    }

    setSaveError(null);
    setSaveState('saving');
    try {
      const payload = {
        match,
        team,
        alliance: alliance === 'blue' ? 'AZUL' : 'ROJO',
        scouter: scouter.trim(),
        startPos,
        autoLeave,
        autoPark,
        autoHivePollen,
        autoHiveNectar,
        autoFlowerPollen,
        autoFlowerNectar,
        teleopHivePollen,
        teleopHiveNectar,
        flowerPollen,
        flowerNectar,
        bottomNectar,
        flowerOwnership,
        flowerOwner: flowerOwnership,
        gardenElements,
        gardenDescore,
        teleopPark,
        status: robotStatus,
        minorFouls,
        majorFouls,
        cardStatus,
        driverSkill: driverSkill ?? 3,
        driverRating: driverSkill ?? 3,
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

      if (typeof navigator !== 'undefined') {
        navigator.vibrate?.(45);
      }
      setSaveState('saved');
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = setTimeout(() => {
        setSaveState('idle');
        setMatch((prev) => prev + 1);
        handleResetForNextMatch();
      }, 1150);
    } catch (err: any) {
      setSaveState('error');
      setSaveError(err.message || 'Error de conexión');
    }
  };

  return (
    <>
      {/* Toast Notification (solo para eventos de schedule) */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{toastMessage}</span>
      </div>

      {/* Header Web Móvil */}
      <div className="fintech-header" style={{ gap: '8px' }}>
        <NautilusNavMenu />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => setShowEventModal(true)}
            className="dock-pill-btn mono-tabular"
            style={{
              flex: 'none',
              padding: '6px 8px',
              fontSize: '11px',
              background: '#451F66',
              borderColor: '#EDB824',
              color: '#FFFFFF',
              borderRadius: '4px',
            }}
            title="Configurar Evento de FTC"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EDB824" strokeWidth="2.4">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{eventInfo ? eventInfo.code : 'Evento'}</span>
          </button>

          {saveState === 'saved' ? (
            <div
              className="mono-tabular save-success-pulse"
              role="status"
              aria-live="polite"
              style={{
                background: '#EDB824',
                border: '1px solid #EDB824',
                color: '#010124',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: '10px',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                letterSpacing: '0.2px',
              }}
            >
              GUARDADO ✓
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveState === 'saving'}
              className="header-action-icon"
              style={{
                width: '34px',
                height: '34px',
                borderColor: isFormComplete ? '#EDB824' : '#451F66',
                background: isFormComplete ? '#451F66' : '#070733',
                color: isFormComplete ? '#EDB824' : 'var(--nautilus-gray)',
                opacity: saveState === 'saving' ? 0.6 : 1,
              }}
              title={isFormComplete ? 'Guardar y Sincronizar' : 'Completa todos los campos para guardar'}
            >
              {saveState === 'saving' ? (
                <span className="mono-tabular" style={{ fontSize: '10px', fontWeight: 800 }}>...</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Alianza & Match Info */}
      <div className="action-dock" style={{ gap: '8px', padding: '0 0 14px 0' }}>
        <button
          onClick={() => setAlliance('blue')}
          className="dock-pill-btn"
          style={{
            background: alliance === 'blue' ? 'rgba(59, 130, 246, 0.16)' : '#070733',
            border: alliance === 'blue' ? '2px solid #3B82F6' : '1px solid #451F66',
            color: alliance === 'blue' ? '#FFFFFF' : 'var(--nautilus-gray)',
            borderRadius: '4px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3B82F6' }}></span>
          <span>Alianza Azul</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#070733',
            border: '1px solid #451F66',
            borderRadius: '4px',
            padding: '4px 10px',
            height: '38px',
          }}
        >
          <span className="mono-tabular" style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 700 }}>M#</span>
          <input
            type="number"
            value={match}
            onChange={(e) => setMatch(parseInt(e.target.value) || 1)}
            className="mono-tabular"
            style={{
              width: '34px',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
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
            background: alliance === 'red' ? 'rgba(239, 68, 68, 0.16)' : '#070733',
            border: alliance === 'red' ? '2px solid #EF4444' : '1px solid #451F66',
            color: alliance === 'red' ? '#FFFFFF' : 'var(--nautilus-gray)',
            borderRadius: '4px',
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
                background: '#070733',
                border: '1px solid #451F66',
                borderRadius: '4px',
                padding: '4px 10px',
                gap: '4px',
              }}
            >
              <span className="mono-tabular" style={{ color: '#EDB824', fontWeight: 800 }}>#</span>
              <input
                type="number"
                value={team}
                onChange={(e) => setTeam(parseInt(e.target.value) || 0)}
                className="mono-tabular"
                style={{
                  width: '62px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
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
                  className="mono-tabular"
                  style={{
                    background: '#070733',
                    border: team === t ? '2px solid #EDB824' : '1px solid #451F66',
                    color: team === t ? '#EDB824' : 'var(--nautilus-gray)',
                    borderRadius: '4px',
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
            <span className="mono-tabular" style={{ fontSize: '11px', color: '#EDB824', fontWeight: 700 }}>
              {currentMatchSchedule.tournamentLevel} #{currentMatchSchedule.matchNum}
              {lockedStation !== 'none' ? ` • ${lockedStation === 'Blue-One' ? 'A1' : lockedStation === 'Blue-Two' ? 'A2' : lockedStation === 'Red-One' ? 'R1' : 'R2'}` : ''}
            </span>
          )}
        </div>

        {/* Tarjetas de Estación (A1–R2) desde FTCScout */}
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
                    background: '#070733',
                    border: isSelected ? '2px solid #EDB824' : '1px solid #451F66',
                    borderRadius: '4px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="mono-tabular"
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: isSelected ? '#EDB824' : isBlue ? '#93C5FD' : '#FCA5A5',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="mono-tabular"
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isSelected ? '#EDB824' : '#FFFFFF',
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
                showMissing={showValidation}
                onChange={setStartPos}
              />
            </div>

            <CounterRow
              title="POLLEN en Balancín (Hive)"
              value={autoHivePollen}
              onDecrement={() => setAutoHivePollen(Math.max(0, autoHivePollen - 1))}
              onIncrement={() => setAutoHivePollen(autoHivePollen + 1)}
            />

            <CounterRow
              title="Néctar en Balancín (Hive)"
              value={autoHiveNectar}
              onDecrement={() => setAutoHiveNectar(Math.max(0, autoHiveNectar - 1))}
              onIncrement={() => setAutoHiveNectar(autoHiveNectar + 1)}
            />

            <CounterRow
              title="POLLEN en Flor (Flower)"
              value={autoFlowerPollen}
              onDecrement={() => setAutoFlowerPollen(Math.max(0, autoFlowerPollen - 1))}
              onIncrement={() => setAutoFlowerPollen(autoFlowerPollen + 1)}
            />

            <CounterRow
              title="Néctar en Flor (Flower)"
              value={autoFlowerNectar}
              onDecrement={() => setAutoFlowerNectar(Math.max(0, autoFlowerNectar - 1))}
              onIncrement={() => setAutoFlowerNectar(autoFlowerNectar + 1)}
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
              title="POLLEN en Balancín (Hive)"
              value={teleopHivePollen}
              onDecrement={() => setTeleopHivePollen(Math.max(0, teleopHivePollen - 1))}
              onIncrement={() => setTeleopHivePollen(teleopHivePollen + 1)}
            />

            <CounterRow
              title="Néctar en Balancín (Hive)"
              value={teleopHiveNectar}
              onDecrement={() => setTeleopHiveNectar(Math.max(0, teleopHiveNectar - 1))}
              onIncrement={() => setTeleopHiveNectar(teleopHiveNectar + 1)}
            />

            {/* Propiedad de la Flor */}
            <div
              className="open-row"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '10px',
                borderBottomColor: showValidation && !flowerOwnership ? '#EF4444' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Propiedad de la Flor</span>
                <span style={{ fontSize: '11px', color: showValidation && !flowerOwnership ? '#EF4444' : 'var(--nautilus-gold)' }}>
                  {showValidation && !flowerOwnership ? 'Requerido' : 'Néctar superior'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['Controló Flor', 'Perdió Control', 'No compitió'] as const).map((own) => (
                  <button
                    key={own}
                    onClick={() => setFlowerOwnership(own)}
                    className={`btn-chip-duo ${flowerOwnership === own ? 'selected' : ''}`}
                    style={{
                      borderColor: flowerOwnership === own ? '#EDB824' : showValidation && !flowerOwnership ? '#EF4444' : undefined,
                    }}
                  >
                    {own}
                  </button>
                ))}
              </div>
            </div>

            <CounterRow
              title="POLLEN en Flor (Flower)"
              value={flowerPollen}
              onDecrement={() => setFlowerPollen(Math.max(0, flowerPollen - 1))}
              onIncrement={() => setFlowerPollen(flowerPollen + 1)}
            />

            <CounterRow
              title="Néctar en Flor (Flower)"
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
            <div
              className="open-row"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '10px',
                borderBottomColor: showValidation && !robotStatus ? '#EF4444' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Estatus del Robot</span>
                <span style={{ fontSize: '11px', color: showValidation && !robotStatus ? '#EF4444' : 'var(--nautilus-gray)' }}>
                  {showValidation && !robotStatus ? 'Requerido' : 'Filtro de confiabilidad'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['100% Operativo', 'Falla Mecánica Parcial', 'Desconectado/Inmóvil', 'No se presentó'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRobotStatus(st)}
                    className="btn-chip-duo"
                    style={{
                      background: '#070733',
                      border: robotStatus === st
                        ? `2px solid ${st === '100% Operativo' ? '#10B981' : '#EF4444'}`
                        : showValidation && !robotStatus
                          ? '1px solid #EF4444'
                          : '1px solid #451F66',
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
            <div
              className="open-row"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '10px',
                borderBottomColor: showValidation && !cardStatus ? '#EF4444' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Tarjetas de Arbitraje</span>
                <span style={{ fontSize: '11px', color: showValidation && !cardStatus ? '#EF4444' : 'var(--nautilus-gray)' }}>
                  {showValidation && !cardStatus ? 'Requerido' : '2 amarillas = DQ'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['Ninguna', 'Amarilla', 'Roja'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCardStatus(c)}
                    className="btn-chip-duo"
                    style={{
                      background: cardStatus === c && c === 'Ninguna' ? '#451F66' : '#070733',
                      border: cardStatus === c
                        ? `2px solid ${c === 'Amarilla' ? '#EAB308' : c === 'Roja' ? '#EF4444' : '#EDB824'}`
                        : showValidation && !cardStatus
                          ? '1px solid #EF4444'
                          : '1px solid #451F66',
                      color: cardStatus === c ? (c === 'Ninguna' ? '#EDB824' : '#FFFFFF') : undefined,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Skill Rating */}
            <div
              className="open-row"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '10px',
                borderBottomColor: showValidation && driverSkill === null ? '#EF4444' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Habilidad del Piloto (1 a 5)</span>
                <span className="mono-tabular" style={{ fontSize: '12px', fontWeight: 800, color: driverSkill !== null ? '#EDB824' : showValidation ? '#EF4444' : 'var(--nautilus-gray)' }}>
                  {driverSkill !== null ? `${driverSkill} / 5` : 'Requerido'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDriverSkill(num)}
                    className="btn-chip-duo mono-tabular"
                    style={{
                      background: driverSkill === num ? '#EDB824' : '#070733',
                      border: driverSkill === num ? '2px solid #EDB824' : showValidation && driverSkill === null ? '1px solid #EF4444' : '1px solid #451F66',
                      color: driverSkill === num ? '#010124' : '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre del Scouter (requerido, persistente) */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-duo-label">Nombre del Scouter</label>
                {showValidation && !scouter.trim() && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444' }}>Requerido</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Ej. Sofia / Carlos (se guarda automático)"
                value={scouter}
                onChange={(e) => handleScouterChange(e.target.value)}
                style={{
                  background: '#070733',
                  border: showValidation && !scouter.trim() ? '1px solid #EF4444' : '1px solid #451F66',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Notas Tácticas */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <label className="input-duo-label">Notas Tácticas Breves (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Se atora en bordes, intake rápido..."
                value={tacticalNotes}
                onChange={(e) => setTacticalNotes(e.target.value)}
                style={{
                  background: '#070733',
                  border: '1px solid #451F66',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Checklist de campos faltantes antes de guardar */}
            {!isFormComplete && (
              <div
                style={{
                  marginTop: '8px',
                  background: '#070733',
                  border: showValidation ? '1px solid #EF4444' : '1px solid #451F66',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span className="mono-tabular" style={{ fontSize: '11px', fontWeight: 700, color: showValidation ? '#FCA5A5' : 'var(--nautilus-gray)' }}>
                  Falta completar ({missingItems.length}):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {missingItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.tab) setCurrentTab(item.tab);
                      }}
                      style={{
                        background: '#451F66',
                        border: '1px solid #EDB824',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        cursor: item.tab ? 'pointer' : 'default',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {saveState === 'error' && saveError && (
              <div
                className="mono-tabular"
                style={{
                  marginTop: '8px',
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid #EF4444',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FCA5A5',
                }}
              >
                Error al guardar: {saveError}
              </div>
            )}

            {/* Botón Principal de Guardar al finalizar Endgame */}
            {saveState === 'saved' ? (
              <div
                role="status"
                aria-live="polite"
                className="dock-pill-btn mono-tabular save-success-pulse"
                style={{
                  marginTop: '14px',
                  background: '#EDB824',
                  border: '2px solid #EDB824',
                  borderRadius: '4px',
                  color: '#010124',
                  fontWeight: 900,
                  fontSize: '15px',
                  padding: '15px 20px',
                }}
              >
                GUARDADO ✓
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saveState === 'saving'}
                className="dock-pill-btn mono-tabular"
                style={{
                  marginTop: '14px',
                  background: isFormComplete ? '#EDB824' : '#070733',
                  border: isFormComplete ? '1px solid #EDB824' : '1px solid #451F66',
                  borderRadius: '4px',
                  color: isFormComplete ? '#010124' : 'var(--nautilus-gray)',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '15px 20px',
                  opacity: saveState === 'saving' ? 0.6 : 1,
                }}
              >
                {saveState === 'saving'
                  ? 'Guardando...'
                  : isFormComplete
                    ? `Guardar Match #${match}`
                    : `Completa ${missingItems.length} campo${missingItems.length === 1 ? '' : 's'} para guardar`}
              </button>
            )}
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
              background: '#04042B',
              border: '2px solid #451F66',
              borderRadius: '6px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #451F66', paddingBottom: '10px' }}>
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
                  background: '#070733',
                  border: '1px solid #EDB824',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div>
                  <div className="mono-tabular" style={{ fontSize: '12px', fontWeight: 800, color: '#EDB824' }}>
                    {eventInfo.code} ({eventInfo.season})
                  </div>
                  <div style={{ fontSize: '11px', color: '#FFFFFF' }}>{eventInfo.name}</div>
                  <div className="mono-tabular" style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                    {scheduleMatches.length} partidos en memoria
                  </div>
                </div>
                <button
                  onClick={handleClearEvent}
                  style={{
                    background: '#451F66',
                    border: '1px solid #EF4444',
                    color: '#FCA5A5',
                    borderRadius: '4px',
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

            {/* Temporada + Búsqueda / Código */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[2026, 2025, 2024].map((yr) => (
                  <button
                    key={yr}
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
                  placeholder="Buscar nombre o código (ej. Mexico, MXCMP)"
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

              {searchQuery.trim().length >= 3 && (
                <button
                  onClick={() => handleLoadEventByCode(searchQuery)}
                  disabled={loadingEvent}
                  className="mono-tabular"
                  style={{
                    background: '#070733',
                    border: '1px dashed #EDB824',
                    borderRadius: '4px',
                    padding: '8px',
                    color: '#EDB824',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {loadingEvent ? 'Cargando...' : `Cargar directo "${searchQuery.trim().toUpperCase()}"`}
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
                      background: '#070733',
                      border: '1px solid #451F66',
                      borderRadius: '4px',
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
                      <div className="mono-tabular" style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                        {ev.code} • {ev.regionCode} • {ev.start}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824' }}>Elegir →</span>
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
