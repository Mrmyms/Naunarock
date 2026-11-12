'use client';

import React, { useState } from 'react';

export default function MatchScoutingPage() {
  // Metadatos
  const [alliance, setAlliance] = useState<'blue' | 'red'>('blue');
  const [match, setMatch] = useState(1);
  const [team, setTeam] = useState(4010);
  const [scouter, setScouter] = useState('');
  const [currentTab, setCurrentTab] = useState<'auto' | 'teleop' | 'endgame'>('auto');

  // AUTO (30s)
  const [startPos, setStartPos] = useState<'Pared Exterior' | 'Centro' | 'Cerca de Hives'>('Pared Exterior');
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
        <div className="user-profile-badge">
          <div className="avatar-circle">
            <span>4010</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 500 }}>
              Scouting Oficial • FTC BIOBUZZ
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--nautilus-white)', letterSpacing: '-0.2px' }}>
              NAUTILUS 4010
            </div>
          </div>
        </div>

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

      {/* Hero Score Card */}
      <div className="hero-balance-section">
        <div className="hero-balance-label">Puntaje Neto Proyectado (EPA)</div>
        <div className="hero-balance-amount">
          <span>{netScore}</span>
          <span style={{ fontSize: '20px', color: 'var(--nautilus-gold)', fontWeight: 700 }}>PTS</span>
        </div>
        <div className="hero-balance-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          </svg>
          <span>Match #{match} • Robot #{team}</span>
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
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }}></span>
          <span>Alianza Azul</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
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
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
          <span>Alianza Roja</span>
        </button>
      </div>

      {/* Tabs Principales: Autónomo / TeleOp / Endgame */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
        <button
          onClick={() => setCurrentTab('auto')}
          className="dock-pill-btn"
          style={{
            background: currentTab === 'auto' ? 'rgba(237, 184, 36, 0.16)' : 'rgba(255, 255, 255, 0.03)',
            borderColor: currentTab === 'auto' ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)',
            color: currentTab === 'auto' ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
            padding: '10px 4px',
            fontSize: '11px',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span>AUTÓNOMO</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: currentTab === 'auto' ? 'var(--nautilus-white)' : 'var(--nautilus-gray)' }}>
            {autoScore} pts
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('teleop')}
          className="dock-pill-btn"
          style={{
            background: currentTab === 'teleop' ? 'rgba(237, 184, 36, 0.16)' : 'rgba(255, 255, 255, 0.03)',
            borderColor: currentTab === 'teleop' ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)',
            color: currentTab === 'teleop' ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
            padding: '10px 4px',
            fontSize: '11px',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span>TELEOP</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: currentTab === 'teleop' ? 'var(--nautilus-white)' : 'var(--nautilus-gray)' }}>
            {teleScore} pts
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('endgame')}
          className="dock-pill-btn"
          style={{
            background: currentTab === 'endgame' ? 'rgba(237, 184, 36, 0.16)' : 'rgba(255, 255, 255, 0.03)',
            borderColor: currentTab === 'endgame' ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)',
            color: currentTab === 'endgame' ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
            padding: '10px 4px',
            fontSize: '11px',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span>ENDGAME</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: currentTab === 'endgame' ? '#EF4444' : 'var(--nautilus-gray)' }}>
            -{foulsScore} pts
          </span>
        </button>
      </div>

      {/* Robot Selector Rápido */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 700, textTransform: 'uppercase' }}>Robot:</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
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

        <div style={{ display: 'flex', gap: '6px' }}>
          {[4010, 4635, 12518].map((t) => (
            <button
              key={t}
              onClick={() => setTeam(t)}
              style={{
                background: team === t ? 'rgba(237, 184, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${team === t ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                color: team === t ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
                borderRadius: '12px',
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
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      <div className="fintech-content-section" style={{ padding: 0 }}>
        {/* ================= 1. PESTAÑA AUTÓNOMO ================= */}
        {currentTab === 'auto' && (
          <div className="glass-list">
            {/* Posición Inicial */}
            <div className="glass-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Posición de Inicio</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>Evita colisión aliada</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['Pared Exterior', 'Centro', 'Cerca de Hives'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setStartPos(pos)}
                    className="btn-chip-duo"
                    style={{
                      padding: '8px 4px',
                      fontSize: '10px',
                      background: startPos === pos ? 'rgba(237, 184, 36, 0.18)' : undefined,
                      borderColor: startPos === pos ? 'var(--nautilus-gold)' : undefined,
                      color: startPos === pos ? 'var(--nautilus-gold)' : undefined,
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Hive Tips */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Auto Hive Tips (+20 pts)</div>
                  <div className="item-sub-text">Panales volteados en auto</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setAutoHiveTips(Math.max(0, autoHiveTips - 1))}>-</button>
                <span className="fintech-counter-num">{autoHiveTips}</span>
                <button className="fintech-btn-circle gold" onClick={() => setAutoHiveTips(autoHiveTips + 1)}>+</button>
              </div>
            </div>

            {/* Polen / Néctar en Auto */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Piezas en Auto (+2 pts)</div>
                  <div className="item-sub-text">Polen o Néctar colocado</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setAutoPollen(Math.max(0, autoPollen - 1))}>-</button>
                <span className="fintech-counter-num">{autoPollen}</span>
                <button className="fintech-btn-circle gold" onClick={() => setAutoPollen(autoPollen + 1)}>+</button>
              </div>
            </div>

            {/* Auto Leave Toggle */}
            <div
              className="glass-list-item"
              onClick={() => setAutoLeave(!autoLeave)}
              style={{ cursor: 'pointer', borderColor: autoLeave ? 'rgba(16, 185, 129, 0.4)' : undefined }}
            >
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: autoLeave ? '#10B981' : undefined }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Auto Leave (+3 pts)</div>
                  <div className="item-sub-text">Despegó del muro perimetral</div>
                </div>
              </div>
              <div className="amount-text" style={{ color: autoLeave ? '#10B981' : 'var(--nautilus-gray)' }}>
                {autoLeave ? 'SÍ (+3)' : 'NO'}
              </div>
            </div>

            {/* Auto Park Toggle */}
            <div
              className="glass-list-item"
              onClick={() => setAutoPark(!autoPark)}
              style={{ cursor: 'pointer', borderColor: autoPark ? 'rgba(16, 185, 129, 0.4)' : undefined }}
            >
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: autoPark ? '#10B981' : undefined }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Auto Park (+5 pts)</div>
                  <div className="item-sub-text">Aparcado en Loading Zone</div>
                </div>
              </div>
              <div className="amount-text" style={{ color: autoPark ? '#10B981' : 'var(--nautilus-gray)' }}>
                {autoPark ? 'SÍ (+5)' : 'NO'}
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. PESTAÑA TELEOP ================= */}
        {currentTab === 'teleop' && (
          <div className="glass-list">
            {/* TeleOp Hive Tips */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Hive Tips (+20 pts)</div>
                  <div className="item-sub-text">Volteos (Meta: 4 y 7 TIPS para RP)</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setTeleopHiveTips(Math.max(0, teleopHiveTips - 1))}>-</button>
                <span className="fintech-counter-num">{teleopHiveTips}</span>
                <button className="fintech-btn-circle gold" onClick={() => setTeleopHiveTips(teleopHiveTips + 1)}>+</button>
              </div>
            </div>

            {/* Propiedad de la Flor */}
            <div className="glass-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Propiedad de la Flor</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gold)' }}>Néctar superior</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['Controló Flor', 'Perdió Control', 'No compitió'] as const).map((own) => (
                  <button
                    key={own}
                    onClick={() => setFlowerOwnership(own)}
                    className="btn-chip-duo"
                    style={{
                      padding: '8px 2px',
                      fontSize: '10px',
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

            {/* Polen en Flor */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Polen en Flor (+2 pts)</div>
                  <div className="item-sub-text">Puntúa si se posee la flor</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setFlowerPollen(Math.max(0, flowerPollen - 1))}>-</button>
                <span className="fintech-counter-num">{flowerPollen}</span>
                <button className="fintech-btn-circle gold" onClick={() => setFlowerPollen(flowerPollen + 1)}>+</button>
              </div>
            </div>

            {/* Néctar en Flor */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Néctar en Flor (+2 pts)</div>
                  <div className="item-sub-text">Elementos de néctar depositados</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setFlowerNectar(Math.max(0, flowerNectar - 1))}>-</button>
                <span className="fintech-counter-num">{flowerNectar}</span>
                <button className="fintech-btn-circle gold" onClick={() => setFlowerNectar(flowerNectar + 1)}>+</button>
              </div>
            </div>

            {/* Bottom Nectar Bonus */}
            <div
              className="glass-list-item"
              onClick={() => setBottomNectar(!bottomNectar)}
              style={{ cursor: 'pointer', borderColor: bottomNectar ? 'rgba(237, 184, 36, 0.4)' : undefined }}
            >
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: bottomNectar ? 'var(--nautilus-gold)' : undefined }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Bottom Nectar Bonus (+5)</div>
                  <div className="item-sub-text">Néctar más bajo en flor</div>
                </div>
              </div>
              <div className="amount-text" style={{ color: bottomNectar ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)' }}>
                {bottomNectar ? 'SÍ (+5)' : 'NO'}
              </div>
            </div>

            {/* Garden Elements */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3z" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Piezas en Garden (+1 pt)</div>
                  <div className="item-sub-text">Acumuladas en su jardín</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setGardenElements(Math.max(0, gardenElements - 1))}>-</button>
                <span className="fintech-counter-num">{gardenElements}</span>
                <button className="fintech-btn-circle gold" onClick={() => setGardenElements(gardenElements + 1)}>+</button>
              </div>
            </div>

            {/* Garden Descoring Toggle */}
            <div
              className="glass-list-item"
              onClick={() => setGardenDescore(!gardenDescore)}
              style={{ cursor: 'pointer', borderColor: gardenDescore ? 'rgba(59, 130, 246, 0.4)' : undefined }}
            >
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: gardenDescore ? '#60A5FA' : undefined }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Defensa Garden (Descore)</div>
                  <div className="item-sub-text">¿Robó/removió piezas rivales?</div>
                </div>
              </div>
              <div className="amount-text" style={{ color: gardenDescore ? '#60A5FA' : 'var(--nautilus-gray)' }}>
                {gardenDescore ? 'SÍ' : 'NO'}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. PESTAÑA ENDGAME ================= */}
        {currentTab === 'endgame' && (
          <div className="glass-list">
            {/* TeleOp Park */}
            <div
              className="glass-list-item"
              onClick={() => setTeleopPark(!teleopPark)}
              style={{ cursor: 'pointer', borderColor: teleopPark ? 'rgba(16, 185, 129, 0.4)' : undefined }}
            >
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: teleopPark ? '#10B981' : undefined }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Endgame Park (+5 pts)</div>
                  <div className="item-sub-text">Aparcado al silbato final</div>
                </div>
              </div>
              <div className="amount-text" style={{ color: teleopPark ? '#10B981' : 'var(--nautilus-gray)' }}>
                {teleopPark ? 'SÍ (+5)' : 'NO'}
              </div>
            </div>

            {/* Estatus de Operatividad del Robot */}
            <div className="glass-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Estatus del Robot</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>Filtro de confiabilidad</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(['100% Operativo', 'Falla Mecánica Parcial', 'Desconectado/Inmóvil', 'No se presentó'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRobotStatus(st)}
                    className="btn-chip-duo"
                    style={{
                      padding: '8px 6px',
                      fontSize: '10px',
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

            {/* Faltas Menores */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: '#F87171' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Faltas Menores (-5 pts)</div>
                  <div className="item-sub-text">Puntos otorgados al rival</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setMinorFouls(Math.max(0, minorFouls - 1))}>-</button>
                <span className="fintech-counter-num">{minorFouls}</span>
                <button className="fintech-btn-circle" style={{ background: '#EF4444', color: '#fff', border: 'none' }} onClick={() => setMinorFouls(minorFouls + 1)}>+</button>
              </div>
            </div>

            {/* Faltas Mayores */}
            <div className="glass-list-item">
              <div className="glass-list-left">
                <div className="item-icon-box" style={{ color: '#EF4444' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  </svg>
                </div>
                <div>
                  <div className="item-main-text">Faltas Graves (-20 pts)</div>
                  <div className="item-sub-text">Interferencias mayores (G417)</div>
                </div>
              </div>
              <div className="fintech-counter-row">
                <button className="fintech-btn-circle" onClick={() => setMajorFouls(Math.max(0, majorFouls - 1))}>-</button>
                <span className="fintech-counter-num">{majorFouls}</span>
                <button className="fintech-btn-circle" style={{ background: '#DC2626', color: '#fff', border: 'none' }} onClick={() => setMajorFouls(majorFouls + 1)}>+</button>
              </div>
            </div>

            {/* Tarjetas Amarilla / Roja */}
            <div className="glass-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Tarjetas de Arbitraje</span>
                <span style={{ fontSize: '11px', color: 'var(--nautilus-gray)' }}>2 amarillas = DQ</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['Ninguna', 'Amarilla', 'Roja'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCardStatus(c)}
                    className="btn-chip-duo"
                    style={{
                      padding: '8px 4px',
                      fontSize: '11px',
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
            <div className="glass-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-main-text">Habilidad del Piloto (1 a 5)</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--nautilus-gold)' }}>★ {driverSkill} / 5</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDriverSkill(num)}
                    style={{
                      background: driverSkill === num ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.04)',
                      color: driverSkill === num ? '#010124' : 'var(--nautilus-white)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas Tácticas */}
            <div className="input-duo-box">
              <label className="input-duo-label">Notas Tácticas Breves</label>
              <input
                type="text"
                placeholder="Ej. Se atora en bordes, intake rápido..."
                value={tacticalNotes}
                onChange={(e) => setTacticalNotes(e.target.value)}
                className="input-duo-field"
                style={{ fontSize: '13px', fontWeight: 500 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Botón Flotante para Guardar */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="fab-sparkle"
        title="Guardar Registro en Google Sheets"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
      </button>
    </>
  );
}
