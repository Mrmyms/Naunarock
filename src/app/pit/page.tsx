'use client';

import React, { useState } from 'react';

export default function PitScoutingPage() {
  const [teamNumber, setTeamNumber] = useState(4010);
  const [teamName, setTeamName] = useState('Nautilus');
  const [chassisType, setChassisType] = useState('Mecanum');
  const [weight, setWeight] = useState(38);
  const [intakeType, setIntakeType] = useState('Rodillos Compliant');
  const [capacity, setCapacity] = useState('1 pieza (Single)');
  const [hiveMech, setHiveMech] = useState('Shooter a distancia');
  const [flowerMech, setFlowerMech] = useState('Disparo elevado');
  const [autoSide, setAutoSide] = useState('Indiferente');
  const [preferredRole, setPreferredRole] = useState('Hive Tipper');
  const [driverHours, setDriverHours] = useState('> 15 horas');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      showToast(`Equipo #${teamNumber} (${teamName}) registrado con éxito`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toast Notification (No emojis) */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{toastMessage}</span>
      </div>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--nautilus-white)', margin: 0 }}>
          PIT SCOUTING
        </h1>
        <span style={{ fontSize: '11px', color: 'var(--nautilus-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Inspección Técnica en Pits • Nautilus 4010
        </span>
      </div>

      {/* Team Info Chunky Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
        <div className="input-duo-box">
          <label className="input-duo-label">Equipo #</label>
          <input
            type="number"
            value={teamNumber}
            onChange={(e) => setTeamNumber(parseInt(e.target.value) || 0)}
            className="input-duo-field"
          />
        </div>
        <div className="input-duo-box">
          <label className="input-duo-label">Nombre del Equipo</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="input-duo-field"
            style={{ fontSize: '15px' }}
          />
        </div>
      </div>

      {/* Hardware Section */}
      <div className="card-duo">
        <h3 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--nautilus-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Hardware & Mecánica
        </h3>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Tipo de Chasis
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {['Mecanum', 'Swerve', 'Tank (6WD)'].map((t) => (
              <button
                key={t}
                onClick={() => setChassisType(t)}
                className={`btn-chip-duo ${chassisType === t ? 'selected' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '2px solid var(--nautilus-navy-card-border)' }} />

        <div>
          <label style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Mecanismo de Hive Tip
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {['Shooter a distancia', 'Brazo mecánico', 'Impacto directo', 'No voltea'].map((m) => (
              <button
                key={m}
                onClick={() => setHiveMech(m)}
                className={`btn-chip-duo ${hiveMech === m ? 'selected' : ''}`}
                style={{ fontSize: '11px' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '2px solid var(--nautilus-navy-card-border)' }} />

        <div>
          <label style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Mecanismo de Flor
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {['Disparo elevado', 'Elevador vertical', 'Depósito directo', 'No juega flor'].map((f) => (
              <button
                key={f}
                onClick={() => setFlowerMech(f)}
                className={`btn-chip-duo ${flowerMech === f ? 'selected' : ''}`}
                style={{ fontSize: '11px' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Section */}
      <div className="card-duo">
        <h3 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--nautilus-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Estrategia & Experiencia
        </h3>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Rol Preferido en Cancha
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {['Hive Tipper', 'Flower Finisher', 'Garden Sweeper', 'Híbrido'].map((r) => (
              <button
                key={r}
                onClick={() => setPreferredRole(r)}
                className={`btn-chip-duo ${preferredRole === r ? 'selected-purple' : ''}`}
                style={{ fontSize: '11px' }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '2px solid var(--nautilus-navy-card-border)' }} />

        <div>
          <label style={{ fontSize: '11px', color: 'var(--nautilus-gray)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Horas de Práctica de Drivers
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {['< 5 horas', '5 - 15 horas', '> 15 horas'].map((h) => (
              <button
                key={h}
                onClick={() => setDriverHours(h)}
                className={`btn-chip-duo ${driverHours === h ? 'selected' : ''}`}
                style={{ fontSize: '11px' }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones de pits (construcción, estabilidad, cableado)..."
          style={{
            width: '100%',
            background: 'var(--nautilus-navy)',
            border: '2px solid var(--nautilus-navy-card-border)',
            borderBottom: '4px solid var(--nautilus-navy-card-shadow)',
            borderRadius: '12px',
            padding: '12px',
            color: 'white',
            fontFamily: 'inherit',
            fontSize: '13px',
            minHeight: '70px',
            outline: 'none',
            resize: 'none',
          }}
        />
      </div>

      {/* Big Chunky Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-duo btn-duo-gold"
        style={{
          padding: '16px',
          fontSize: '14px',
          width: '100%',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{submitting ? 'GUARDANDO PIT...' : 'GUARDAR PIT SCOUTING'}</span>
      </button>
    </div>
  );
}
