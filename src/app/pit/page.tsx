'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import BiobuzzFieldSelector from '@/components/BiobuzzFieldSelector';
import NautilusNavMenu from '@/components/NautilusNavMenu';

const SCOUTER_STORAGE_KEY = 'nautilus_4010_scouter_v1';
const CHUNK_SIZE = 45000;
const MAX_CHUNKS_PER_REQ = 35;

const CHASSIS_OPTIONS = ['Mecanum', 'Swerve', 'Tank (6WD/8WD)', 'X-Drive', 'Otro'] as const;
const INTAKE_OPTIONS = ['Rodillos Compliant', 'Bumper Activo', 'Pinza/Garra', 'Por Gravedad', 'Otro'] as const;
const CAPACITY_OPTIONS = ['1 pieza (Single)', '2 piezas', '3+ piezas'] as const;
const HIVE_OPTIONS = ['Shooter', 'Brazo extensible', 'Impacto/Empuje', 'No voltea'] as const;
const SHOOTER_SUBTYPES = ['Torreta', 'Fijo', 'Hood ajustable', 'Dumper', 'Doble volante', 'Otro'] as const;
const FLOWER_OPTIONS = ['Disparo elevado', 'Elevador vertical', 'Depósito directo', 'No juega flor'] as const;
const AUTO_ROUTINE_OPTIONS = ['Leave básico', 'Park directo', 'Hive Tip (1 o 2)', 'Flower scoring', 'Sin Auto'] as const;
const SENSOR_OPTIONS = ['AprilTags (Webcam)', 'Deadwheel Odometry', 'Sensores ToF/Distancia', 'Solo Encoders'] as const;
const ROLE_OPTIONS = ['Hive Tipper (Lanzador)', 'Flower Finisher', 'Garden Sweeper', 'Híbrido'] as const;
const DRIVER_HOURS_OPTIONS = ['< 5 horas', '5 - 15 horas', '> 15 horas'] as const;
const PHOTO_CAPTIONS = ['Vista General', 'Intake', 'Shooter/Hive', 'Flor', 'Chasis', 'Electrónica'] as const;

type PendingPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
  caption: string;
};

type SavedPitEntry = {
  id: number;
  Timestamp?: string;
  EQUIPO?: string | number;
  NOMBRE_EQUIPO?: string;
  SCOUT?: string;
  CHASIS?: string;
  PESO_LB?: string | number;
  INTAKE?: string;
  CAPACIDAD?: string;
  MECANISMO_HIVE?: string;
  MECANISMO_FLOR?: string;
  RUTINAS_AUTO?: string;
  LADO_AUTO?: string;
  SENSORES_VISION?: string;
  AUTO_PTS_EST?: string | number;
  HORAS_DRIVER?: string;
  ROL_PREFERIDO?: string;
  NOTAS?: string;
  FOTOS_COUNT?: string | number;
  photoIds?: string[];
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsRawBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error(`No se pudo leer el archivo ${file.name}`));
        return;
      }
      const header = result.slice(0, commaIdx);
      const mimeMatch = header.match(/^data:([^;]+);base64$/i);
      const mimeType = file.type || mimeMatch?.[1] || 'application/octet-stream';
      const base64 = result.slice(commaIdx + 1);
      resolve({ mimeType, base64 });
    };
    reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function PitScoutingPage() {
  // Identificación
  const [teamNumber, setTeamNumber] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [scouter, setScouter] = useState<string>('');

  // Hardware & Mecánica
  const [chassisType, setChassisType] = useState<string>('Mecanum');
  const [weight, setWeight] = useState<string>('');
  const [intakeType, setIntakeType] = useState<string>('Rodillos Compliant');
  const [capacity, setCapacity] = useState<string>('1 pieza (Single)');
  const [hiveMech, setHiveMech] = useState<string>('Shooter');
  const [shooterType, setShooterType] = useState<string>('Torreta');
  const [shooterOther, setShooterOther] = useState<string>('');
  const [flowerMech, setFlowerMech] = useState<string>('Disparo elevado');

  // Rutas y Software (Auto)
  const [autoRoutines, setAutoRoutines] = useState<string[]>(['Leave básico']);
  const [autoStartZones, setAutoStartZones] = useState<string[]>([]);
  const [fieldAlliance, setFieldAlliance] = useState<'blue' | 'red'>('blue');
  const [sensorsVision, setSensorsVision] = useState<string[]>(['Solo Encoders']);
  const [claimedAutoPoints, setClaimedAutoPoints] = useState<string>('0');

  // Factor Humano & Rol
  const [preferredRole, setPreferredRole] = useState<string>('Hive Tipper (Lanzador)');
  const [driverHours, setDriverHours] = useState<string>('5 - 15 horas');
  const [notes, setNotes] = useState<string>('');

  // Fotos sin comprimir
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef<PendingPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Estado de guardado y registros existentes
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showRecords, setShowRecords] = useState(false);
  const [savedEntries, setSavedEntries] = useState<SavedPitEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    try {
      const savedScouter = localStorage.getItem(SCOUTER_STORAGE_KEY);
      if (savedScouter) setScouter(savedScouter);
    } catch {
      // ignore storage errors
    }
    fetchSavedEntries();

    return () => {
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSavedEntries = async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch('/api/pit');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.entries)) {
        setSavedEntries(json.entries.slice().reverse());
      }
    } catch {
      // ignore initial fetch error; user can still submit
    } finally {
      setLoadingEntries(false);
    }
  };

  const parsedTeam = Number(teamNumber);
  const missingItems = useMemo(() => {
    const missing: string[] = [];
    if (!Number.isFinite(parsedTeam) || parsedTeam < 1) missing.push('Equipo #');
    if (!scouter.trim()) missing.push('Nombre del Scouter');
    return missing;
  }, [parsedTeam, scouter]);

  const isFormComplete = missingItems.length === 0;

  const handleScouterChange = (val: string) => {
    setScouter(val);
    try {
      localStorage.setItem(SCOUTER_STORAGE_KEY, val);
    } catch {
      // ignore storage quota errors
    }
  };

  const toggleMultiOption = (list: string[], value: string, setter: (next: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: PendingPhoto[] = Array.from(fileList).map((file) => ({
      localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: 'Vista General',
    }));
    setPhotos((prev) => [...prev, ...added]);
  };

  const handleRemovePhoto = (localId: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleUpdateCaption = (localId: string, caption: string) => {
    setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, caption } : p)));
  };

  const toggleAutoZone = (zoneId: string) => {
    setAutoStartZones((prev) => {
      if (prev.includes(zoneId)) {
        return prev.filter((z) => z !== zoneId);
      }
      return [...prev, zoneId].sort();
    });
  };

  const handleResetTeamFields = () => {
    setTeamNumber('');
    setTeamName('');
    setChassisType('Mecanum');
    setWeight('');
    setIntakeType('Rodillos Compliant');
    setCapacity('1 pieza (Single)');
    setHiveMech('Shooter');
    setShooterType('Torreta');
    setShooterOther('');
    setFlowerMech('Disparo elevado');
    setAutoRoutines(['Leave básico']);
    setAutoStartZones([]);
    setSensorsVision(['Solo Encoders']);
    setClaimedAutoPoints('0');
    setPreferredRole('Hive Tipper (Lanzador)');
    setDriverHours('5 - 15 horas');
    setNotes('');
    setShowValidation(false);
    setSaveError(null);
    setSaveProgress(null);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const handleSubmit = async () => {
    if (saveState === 'saving' || saveState === 'saved') return;

    if (!isFormComplete) {
      setShowValidation(true);
      if (typeof navigator !== 'undefined') {
        navigator.vibrate?.([20, 40, 20]);
      }
      return;
    }

    setSaveError(null);
    setSaveState('saving');
    setSaveProgress(null);

    try {
      const uploadedPhotoIds: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setSaveProgress(`Leyendo foto ${i + 1}/${photos.length}...`);
        const { mimeType, base64 } = await readFileAsRawBase64(photo.file);

        const chunks: string[] = [];
        for (let offset = 0; offset < base64.length; offset += CHUNK_SIZE) {
          chunks.push(base64.slice(offset, offset + CHUNK_SIZE));
        }

        const photoId = `pit_${parsedTeam}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const totalBatches = Math.ceil(chunks.length / MAX_CHUNKS_PER_REQ);

        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          const startIdx = batchIdx * MAX_CHUNKS_PER_REQ;
          const batchParts = chunks.slice(startIdx, startIdx + MAX_CHUNKS_PER_REQ);

          setSaveProgress(
            totalBatches > 1
              ? `Subiendo foto ${i + 1}/${photos.length} (parte ${batchIdx + 1}/${totalBatches})...`
              : `Subiendo foto ${i + 1}/${photos.length}...`
          );

          const photoRes = await fetch('/api/pit/photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photoId,
              teamNumber: parsedTeam,
              fileName: photo.file.name,
              mimeType,
              caption: photo.caption,
              totalParts: chunks.length,
              startPart: startIdx + 1,
              sizeBytes: photo.file.size,
              parts: batchParts,
            }),
          });

          const photoJson = await photoRes.json();
          if (!photoRes.ok || !photoJson.success) {
            throw new Error(photoJson.error || `Error subiendo foto ${i + 1}`);
          }
        }

        uploadedPhotoIds.push(photoId);
      }

      setSaveProgress('Guardando ficha en Pit_BIOBUZZ...');

      const resolvedHiveMech =
        hiveMech === 'Shooter'
          ? `Shooter (${shooterType === 'Otro' && shooterOther.trim() ? shooterOther.trim() : shooterType})`
          : hiveMech;

      const resolvedAutoSide =
        autoStartZones.length > 0 ? autoStartZones.join(', ') : 'Indiferente';

      const res = await fetch('/api/pit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamNumber: parsedTeam,
          teamName: teamName.trim(),
          scouter: scouter.trim(),
          chassisType,
          weight: weight.trim() === '' ? '' : Number(weight),
          intakeType,
          capacity,
          hiveMech: resolvedHiveMech,
          flowerMech,
          autoRoutines,
          autoSide: resolvedAutoSide,
          sensorsVision,
          claimedAutoPoints: Number(claimedAutoPoints) || 0,
          driverHours,
          preferredRole,
          notes: notes.trim(),
          photoIds: uploadedPhotoIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al guardar ficha de Pit Scouting');
      }

      if (typeof navigator !== 'undefined') {
        navigator.vibrate?.(45);
      }

      setSaveProgress(null);
      setSaveState('saved');
      showToast(`Equipo #${parsedTeam} guardado (${uploadedPhotoIds.length} fotos)`);
      fetchSavedEntries();

      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = setTimeout(() => {
        setSaveState('idle');
        handleResetTeamFields();
      }, 1150);
    } catch (err: any) {
      setSaveState('error');
      setSaveProgress(null);
      setSaveError(err.message || 'Error de conexión al guardar Pit Scouting');
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EDB824" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{toastMessage}</span>
      </div>

      {/* Header Nautilus Telemetría */}
      <div className="fintech-header" style={{ gap: '8px' }}>
        <NautilusNavMenu />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              setShowRecords((prev) => !prev);
              if (!showRecords) fetchSavedEntries();
            }}
            className="dock-pill-btn mono-tabular"
            style={{
              flex: 'none',
              padding: '6px 10px',
              fontSize: '11px',
              background: showRecords ? '#451F66' : '#070733',
              borderColor: showRecords ? '#EDB824' : '#451F66',
              color: showRecords ? '#EDB824' : '#FFFFFF',
              borderRadius: '4px',
            }}
          >
            <span>{showRecords ? 'Formulario' : `Registros (${savedEntries.length})`}</span>
          </button>
        </div>
      </div>

      {/* Título de Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '0.3px' }}>
            PIT SCOUTING
          </h1>
          <span className="mono-tabular" style={{ fontSize: '11px', color: '#EDB824', fontWeight: 700, textTransform: 'uppercase' }}>
            BIOBUZZ • Hoja Pit_BIOBUZZ &amp; Pit_Fotos
          </span>
        </div>
        {photos.length > 0 && !showRecords && (
          <span
            className="mono-tabular"
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#EDB824',
              background: '#070733',
              border: '1px solid #451F66',
              borderRadius: '4px',
              padding: '4px 8px',
            }}
          >
            {photos.length} foto{photos.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ================= VISTA DE REGISTROS GUARDADOS ================= */}
      {showRecords ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="input-duo-label">Equipos inspeccionados ({savedEntries.length})</span>
            <button
              type="button"
              onClick={fetchSavedEntries}
              disabled={loadingEntries}
              className="dock-pill-btn mono-tabular"
              style={{ flex: 'none', padding: '6px 10px', fontSize: '11px' }}
            >
              {loadingEntries ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {savedEntries.length === 0 ? (
            <div
              style={{
                background: '#070733',
                border: '1px solid #451F66',
                borderRadius: '4px',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--nautilus-gray)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {loadingEntries ? 'Consultando Pit_BIOBUZZ...' : 'Aún no hay registros en Pit_BIOBUZZ.'}
            </div>
          ) : (
            <div className="glass-list">
              {savedEntries.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                const entryPhotos = entry.photoIds || [];
                return (
                  <div
                    key={entry.id}
                    style={{
                      background: '#070733',
                      border: isExpanded ? '1px solid #EDB824' : '1px solid #451F66',
                      borderRadius: '4px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div>
                        <div className="mono-tabular" style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                          #{entry.EQUIPO || '?'} {entry.NOMBRE_EQUIPO ? `• ${entry.NOMBRE_EQUIPO}` : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--nautilus-gray)', marginTop: '2px' }}>
                          {entry.CHASIS || '—'} • {entry.ROL_PREFERIDO || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span
                          className="mono-tabular"
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: entryPhotos.length > 0 ? '#EDB824' : 'var(--nautilus-gray)',
                            background: '#010124',
                            border: '1px solid #451F66',
                            borderRadius: '4px',
                            padding: '4px 7px',
                          }}
                        >
                          {entryPhotos.length} foto{entryPhotos.length === 1 ? '' : 's'}
                        </span>
                        <span style={{ color: '#EDB824', fontSize: '12px', fontWeight: 800 }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(69, 31, 102, 0.7)',
                          paddingTop: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: 'var(--nautilus-gray)' }}>
                          <div><strong style={{ color: '#FFFFFF' }}>Peso:</strong> {entry.PESO_LB ? `${entry.PESO_LB} lb` : '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Capacidad:</strong> {entry.CAPACIDAD || '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Intake:</strong> {entry.INTAKE || '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Hive:</strong> {entry.MECANISMO_HIVE || '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Flor:</strong> {entry.MECANISMO_FLOR || '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Lado Auto:</strong> {entry.LADO_AUTO || '—'}</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Auto Est:</strong> {entry.AUTO_PTS_EST ?? '0'} pts</div>
                          <div><strong style={{ color: '#FFFFFF' }}>Drivers:</strong> {entry.HORAS_DRIVER || '—'}</div>
                        </div>

                        {entry.RUTINAS_AUTO && (
                          <div style={{ color: 'var(--nautilus-gray)' }}>
                            <strong style={{ color: '#FFFFFF' }}>Rutinas Auto:</strong> {entry.RUTINAS_AUTO}
                          </div>
                        )}
                        {entry.SENSORES_VISION && (
                          <div style={{ color: 'var(--nautilus-gray)' }}>
                            <strong style={{ color: '#FFFFFF' }}>Sensores/Visión:</strong> {entry.SENSORES_VISION}
                          </div>
                        )}
                        {entry.NOTAS && (
                          <div style={{ color: 'var(--nautilus-gray)' }}>
                            <strong style={{ color: '#FFFFFF' }}>Notas:</strong> {entry.NOTAS}
                          </div>
                        )}
                        <div className="mono-tabular" style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>
                          Scout: {entry.SCOUT || '—'} • {entry.Timestamp || ''}
                        </div>

                        {entryPhotos.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                            {entryPhotos.map((photoId, idx) => {
                              const src = `/api/pit/photo?id=${encodeURIComponent(photoId)}`;
                              return (
                                <button
                                  key={photoId}
                                  type="button"
                                  onClick={() => setLightboxUrl(src)}
                                  style={{
                                    padding: 0,
                                    border: '1px solid #451F66',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    background: '#010124',
                                    cursor: 'pointer',
                                    position: 'relative',
                                  }}
                                >
                                  <img
                                    src={src}
                                    alt={`Robot #${entry.EQUIPO} foto ${idx + 1}`}
                                    loading="lazy"
                                    style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                                  />
                                  <span
                                    className="mono-tabular"
                                    style={{
                                      position: 'absolute',
                                      bottom: '4px',
                                      right: '4px',
                                      background: 'rgba(1, 1, 36, 0.85)',
                                      color: '#EDB824',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    Ver #{idx + 1}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= FORMULARIO COMPLETO PIT SCOUTING ================= */
        <div className="fintech-content-section" style={{ padding: 0 }}>
          <div className="open-list">
            {/* 1. IDENTIFICACIÓN */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                A. Identificación del Equipo
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div
                  className="input-duo-box"
                  style={{
                    borderColor: showValidation && (!Number.isFinite(parsedTeam) || parsedTeam < 1) ? '#EF4444' : '#451F66',
                  }}
                >
                  <label className="input-duo-label">Equipo # *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="4010"
                    value={teamNumber}
                    onChange={(e) => setTeamNumber(e.target.value)}
                    className="input-duo-field mono-tabular"
                    style={{ userSelect: 'text' }}
                  />
                </div>
                <div className="input-duo-box">
                  <label className="input-duo-label">Nombre del Equipo</label>
                  <input
                    type="text"
                    placeholder="Ej. Nautilus"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="input-duo-field"
                    style={{ userSelect: 'text' }}
                  />
                </div>
              </div>

              <div
                className="input-duo-box"
                style={{
                  borderColor: showValidation && !scouter.trim() ? '#EF4444' : '#451F66',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-duo-label">Nombre del Scouter *</label>
                  {showValidation && !scouter.trim() && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444' }}>Requerido</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ej. Sofía / Carlos (se guarda automático)"
                  value={scouter}
                  onChange={(e) => handleScouterChange(e.target.value)}
                  className="input-duo-field"
                  style={{ userSelect: 'text' }}
                />
              </div>
            </div>

            {/* 2. HARDWARE & MECÁNICA */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                B. Hardware &amp; Mecánica
              </span>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Tipo de Chasis
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {CHASSIS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setChassisType(opt)}
                      className={`btn-chip-duo ${chassisType === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-duo-box">
                <label className="input-duo-label">Peso del Robot (lb)</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="máx. 42 lb (R103)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-duo-field mono-tabular"
                  style={{ userSelect: 'text' }}
                />
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Tipo de Intake
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {INTAKE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIntakeType(opt)}
                      className={`btn-chip-duo ${intakeType === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Capacidad de Carga
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {CAPACITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCapacity(opt)}
                      className={`btn-chip-duo ${capacity === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Mecanismo de Hive
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {HIVE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHiveMech(opt)}
                      className={`btn-chip-duo ${hiveMech === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {hiveMech === 'Shooter' && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: '#04042B',
                      border: '1px solid #EDB824',
                      borderRadius: '4px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span className="input-duo-label" style={{ color: '#EDB824' }}>
                      Especifica el Tipo de Shooter
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {SHOOTER_SUBTYPES.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setShooterType(sub)}
                          className={`btn-chip-duo ${shooterType === sub ? 'selected-purple' : ''}`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                    {shooterType === 'Otro' && (
                      <input
                        type="text"
                        placeholder="Especifica el tipo de shooter..."
                        value={shooterOther}
                        onChange={(e) => setShooterOther(e.target.value)}
                        style={{
                          background: '#070733',
                          border: '1px solid #451F66',
                          borderRadius: '4px',
                          padding: '9px 10px',
                          color: '#FFFFFF',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          outline: 'none',
                          userSelect: 'text',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Mecanismo de Flor
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {FLOWER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFlowerMech(opt)}
                      className={`btn-chip-duo ${flowerMech === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. RUTAS Y SOFTWARE (AUTO) */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                C. Rutas &amp; Software (Auto)
              </span>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Rutinas de Autónomo (múltiple)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {AUTO_ROUTINE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMultiOption(autoRoutines, opt, setAutoRoutines)}
                      className={`btn-chip-duo ${autoRoutines.includes(opt) ? 'selected-purple' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setAutoStartZones([])}
                    className={`btn-chip-duo ${autoStartZones.length === 0 ? 'selected' : ''}`}
                    style={{ minHeight: '36px', padding: '6px 12px' }}
                  >
                    Indiferente
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setFieldAlliance('blue')}
                      className="btn-chip-duo"
                      style={{
                        minHeight: '36px',
                        padding: '6px 10px',
                        border: fieldAlliance === 'blue' ? '2px solid #3B82F6' : '1px solid #451F66',
                        color: fieldAlliance === 'blue' ? '#FFFFFF' : undefined,
                        background: fieldAlliance === 'blue' ? 'rgba(59, 130, 246, 0.16)' : '#070733',
                      }}
                    >
                      Vista Azul
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldAlliance('red')}
                      className="btn-chip-duo"
                      style={{
                        minHeight: '36px',
                        padding: '6px 10px',
                        border: fieldAlliance === 'red' ? '2px solid #EF4444' : '1px solid #451F66',
                        color: fieldAlliance === 'red' ? '#FFFFFF' : undefined,
                        background: fieldAlliance === 'red' ? 'rgba(239, 68, 68, 0.16)' : '#070733',
                      }}
                    >
                      Vista Roja
                    </button>
                  </div>
                </div>

                <BiobuzzFieldSelector
                  alliance={fieldAlliance}
                  value=""
                  selectedValues={autoStartZones}
                  teamNumber={parsedTeam > 0 ? parsedTeam : undefined}
                  title="Posición / Lado Preferido en Auto"
                  emptyHint="Indiferente (o toca zonas A–E)"
                  onChange={toggleAutoZone}
                />
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Sensores y Visión (múltiple)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {SENSOR_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMultiOption(sensorsVision, opt, setSensorsVision)}
                      className={`btn-chip-duo ${sensorsVision.includes(opt) ? 'selected-purple' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-duo-box">
                <label className="input-duo-label">Puntos Estimados en Auto</label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={claimedAutoPoints}
                  onChange={(e) => setClaimedAutoPoints(e.target.value)}
                  className="input-duo-field mono-tabular"
                  style={{ userSelect: 'text' }}
                />
              </div>
            </div>

            {/* 4. FACTOR HUMANO & ROL */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                D. Factor Humano &amp; Rol
              </span>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Rol Preferido en Cancha
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreferredRole(opt)}
                      className={`btn-chip-duo ${preferredRole === opt ? 'selected-purple' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="input-duo-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Horas de Práctica de Drivers
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {DRIVER_HOURS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDriverHours(opt)}
                      className={`btn-chip-duo ${driverHours === opt ? 'selected' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-duo-box">
                <label className="input-duo-label">Notas de Pits (Opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Construcción, estabilidad, cableado, centro de gravedad..."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    minHeight: '72px',
                    resize: 'vertical',
                    userSelect: 'text',
                  }}
                />
              </div>
            </div>

            {/* 5. FOTOS DEL ROBOT (MÚLTIPLES, SIN COMPRIMIR) */}
            <div className="open-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EDB824', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                E. Fotos del Robot ({photos.length})
              </span>

              {/* Inputs ocultos */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="dock-pill-btn"
                  style={{ borderColor: '#EDB824', background: '#451F66', color: '#FFFFFF' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EDB824" strokeWidth="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Tomar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="dock-pill-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EDB824" strokeWidth="2.2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Agregar de Galería</span>
                </button>
              </div>

              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.localId}
                      style={{
                        background: '#070733',
                        border: '1px solid #451F66',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '124px', background: '#010124' }}>
                        <img
                          src={photo.previewUrl}
                          alt={`Foto ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.localId)}
                          aria-label={`Eliminar foto ${idx + 1}`}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(1, 1, 36, 0.88)',
                            border: '1px solid #EF4444',
                            color: '#FCA5A5',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✕
                        </button>
                        <span
                          className="mono-tabular"
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            background: 'rgba(1, 1, 36, 0.88)',
                            border: '1px solid #451F66',
                            borderRadius: '3px',
                            padding: '2px 5px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#EDB824',
                          }}
                        >
                          {formatBytes(photo.file.size)}
                        </span>
                      </div>

                      <div style={{ padding: '6px' }}>
                        <select
                          value={photo.caption}
                          onChange={(e) => handleUpdateCaption(photo.localId, e.target.value)}
                          style={{
                            width: '100%',
                            background: '#010124',
                            border: '1px solid #451F66',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '5px 6px',
                            outline: 'none',
                          }}
                        >
                          {PHOTO_CAPTIONS.map((cap) => (
                            <option key={cap} value={cap}>
                              {cap}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Validación */}
          {showValidation && !isFormComplete && (
            <div
              className="mono-tabular"
              style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#FCA5A5',
              }}
            >
              Completa los campos requeridos: {missingItems.join(', ')}
            </div>
          )}

          {/* Error de guardado */}
          {saveState === 'error' && saveError && (
            <div
              className="mono-tabular"
              style={{
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

          {/* Botón Principal de Guardar */}
          {saveState === 'saved' ? (
            <div
              role="status"
              aria-live="polite"
              className="dock-pill-btn mono-tabular save-success-pulse"
              style={{
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
                background: isFormComplete ? '#EDB824' : '#070733',
                border: isFormComplete ? '1px solid #EDB824' : '1px solid #451F66',
                borderRadius: '4px',
                color: isFormComplete ? '#010124' : 'var(--nautilus-gray)',
                fontWeight: 800,
                fontSize: '14px',
                padding: '15px 20px',
                opacity: saveState === 'saving' ? 0.75 : 1,
              }}
            >
              {saveState === 'saving'
                ? saveProgress || 'Guardando...'
                : isFormComplete
                  ? `Guardar Pit Scouting (${photos.length} foto${photos.length === 1 ? '' : 's'})`
                  : `Completa: ${missingItems.join(' y ')}`}
            </button>
          )}
        </div>
      )}

      {/* Lightbox para ver foto guardada en resolución completa */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(1, 1, 20, 0.92)',
            zIndex: 350,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            gap: '12px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '460px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="dock-pill-btn mono-tabular"
              style={{ flex: 'none', padding: '6px 12px', fontSize: '11px', textDecoration: 'none', borderColor: '#EDB824', color: '#EDB824' }}
            >
              Abrir original ↗
            </a>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="header-action-icon"
              style={{ width: '34px', height: '34px' }}
            >
              ✕
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Foto original del robot"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: '4px',
              border: '1px solid #451F66',
            }}
          />
        </div>
      )}
    </>
  );
}
