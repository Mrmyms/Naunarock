'use client';

import React, { useState } from 'react';

export interface StartZone {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  code: string;
  label: string;
  cx: number;
  cy: number;
  path: string;
}

export const RED_START_ZONES: StartZone[] = [
  {
    id: 'A',
    code: 'C1',
    label: 'Centro Audience',
    cx: 143,
    cy: 328.5,
    path: 'M 89 308 Q 89 304 93 304 L 193 304 Q 197 304 197 308 L 197 349 Q 197 353 193 353 L 93 353 Q 89 353 89 349 Z',
  },
  {
    id: 'B',
    code: 'A1',
    label: 'Garden',
    cx: 61.5,
    cy: 323,
    path: 'M 35 303 Q 35 299 39 299 L 84 299 Q 88 299 88 303 L 88 343 Q 88 347 84 347 L 39 347 Q 35 347 35 343 Z',
  },
  {
    id: 'C',
    code: 'A2',
    label: 'Pared Lat.',
    cx: 59.5,
    cy: 259,
    path: 'M 35 226 Q 35 222 39 222 L 80 222 Q 84 222 84 226 L 84 292 Q 84 296 80 296 L 39 296 Q 35 296 35 292 Z',
  },
  {
    id: 'D',
    code: 'A6',
    label: 'Esq. Sup. – Flower',
    cx: 60.5,
    cy: 48,
    path: 'M 86 187 Q 86 191 82 191 L 39 191 Q 35 191 35 187 L 35 139 Q 35 135 39 135 L 58 135 Q 62 135 62 131 L 62 77 Q 62 73 58 73 L 39 73 Q 35 73 35 69 L 35 27 Q 35 23 39 23 L 82 23 Q 86 23 86 27 Z',
  },
  {
    id: 'E',
    code: 'C6',
    label: 'Centro Sup.',
    cx: 169,
    cy: 48,
    path: 'M 193 72 L 91 72 Q 87 72 87 68 L 87 27 Q 87 23 91 23 L 122.4 23 A 12 12 0 0 0 145.6 23 L 193 23 Q 197 23 197 27 L 197 68 Q 197 72 193 72 Z',
  },
];

export const BLUE_START_ZONES: StartZone[] = [
  {
    id: 'A',
    code: 'D6',
    label: 'Centro Sup.',
    cx: 257,
    cy: 47.5,
    path: 'M 203 27 Q 203 23 207 23 L 307 23 Q 311 23 311 27 L 311 68 Q 311 72 307 72 L 207 72 Q 203 72 203 68 Z',
  },
  {
    id: 'B',
    code: 'F6',
    label: 'Garden',
    cx: 338.5,
    cy: 48,
    path: 'M 312 28 Q 312 24 316 24 L 361 24 Q 365 24 365 28 L 365 68 Q 365 72 361 72 L 316 72 Q 312 72 312 68 Z',
  },
  {
    id: 'C',
    code: 'F5',
    label: 'Pared Lat.',
    cx: 340.5,
    cy: 115,
    path: 'M 316 82 Q 316 78 320 78 L 361 78 Q 365 78 365 82 L 365 148 Q 365 152 361 152 L 320 152 Q 316 152 316 148 Z',
  },
  {
    id: 'D',
    code: 'F1',
    label: 'Esq. Inf. – Flower',
    cx: 339.5,
    cy: 328,
    path: 'M 314 189 Q 314 185 318 185 L 361 185 Q 365 185 365 189 L 365 237 Q 365 241 361 241 L 342 241 Q 338 241 338 245 L 338 299 Q 338 303 342 303 L 361 303 Q 365 303 365 307 L 365 349 Q 365 353 361 353 L 318 353 Q 314 353 314 349 Z',
  },
  {
    id: 'E',
    code: 'D1',
    label: 'Centro Audience',
    cx: 229,
    cy: 328.5,
    path: 'M 207 304 L 309 304 Q 313 304 313 308 L 313 349 Q 313 353 309 353 L 277.6 353 A 12 12 0 0 0 254.4 353 L 207 353 Q 203 353 203 349 L 203 308 Q 203 304 207 304 Z',
  },
];

interface BiobuzzFieldSelectorProps {
  alliance: 'blue' | 'red';
  value: string;
  teamNumber?: number;
  showMissing?: boolean;
  onChange: (pos: string) => void;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS = ['6', '5', '4', '3', '2', '1'];

export default function BiobuzzFieldSelector({
  alliance,
  value,
  teamNumber,
  showMissing = false,
  onChange,
}: BiobuzzFieldSelectorProps) {
  const [rotated, setRotated] = useState(false);

  const zones = alliance === 'red' ? RED_START_ZONES : BLUE_START_ZONES;
  const allianceColor = alliance === 'red' ? '#EF4444' : '#3B82F6';
  const allianceGlow = alliance === 'red' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)';
  const selectedZone = zones.find((z) => z.id === value) ?? null;

  // Center of field for 180deg rotation: field is x=[32..368] (cx=200), y=[20..356] (cy=188)
  const fieldTransform = rotated ? 'rotate(180 200 188)' : undefined;
  const uprightText = (cx: number, cy: number) =>
    rotated ? `rotate(180 ${cx} ${cy})` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Header row with selected zone & 180° flip button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="item-main-text">Posición de Inicio</span>
          <span
            className="mono-tabular"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: selectedZone ? '#EDB824' : showMissing ? '#EF4444' : 'var(--nautilus-gray)',
            }}
          >
            {selectedZone ? `Posición ${selectedZone.id} · ${selectedZone.label} (${selectedZone.code})` : 'Toca una zona (A–E) en el mapa'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRotated((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '4px',
            background: rotated ? '#451F66' : '#070733',
            border: rotated ? '2px solid #EDB824' : '1px solid #451F66',
            color: rotated ? '#EDB824' : '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Girar cancha 180 grados"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Girar 180°
        </button>
      </div>

      {/* Interactive BIOBUZZ 6x6 Field SVG (based on Manual V1 Figures 9-3, 9-5, 11-1) */}
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto',
          borderRadius: '6px',
          padding: '8px',
          background: '#04042B',
          border: showMissing && !selectedZone ? '2px solid #EF4444' : '1px solid #451F66',
        }}
      >
        <svg
          viewBox="0 0 384 372"
          width="100%"
          style={{ display: 'block', userSelect: 'none', touchAction: 'manipulation' }}
          role="img"
          aria-label="Mapa interactivo de cancha FTC BIOBUZZ 6 por 6"
        >
          {/* Rotatable Field Group */}
          <g transform={fieldTransform}>
            {/* Outer Field Perimeter */}
            <rect
              x="32"
              y="20"
              width="336"
              height="336"
              rx="4"
              fill="#04042B"
              stroke="#451F66"
              strokeWidth="2"
            />

            {/* 6x6 Tile Checkerboard + Purple Grid Seams (#451F66 at 60%) */}
            {ROWS.map((rowLabel, rIdx) =>
              COLS.map((colLabel, cIdx) => {
                const tx = 32 + cIdx * 56;
                const ty = 20 + rIdx * 56;
                const isAlt = (rIdx + cIdx) % 2 === 0;
                return (
                  <rect
                    key={`${colLabel}${rowLabel}`}
                    x={tx}
                    y={ty}
                    width="56"
                    height="56"
                    fill={isAlt ? '#04042B' : '#070733'}
                    stroke="rgba(69, 31, 102, 0.6)"
                    strokeWidth="1"
                  />
                );
              })
            )}

            {/* Midline separating Red (A-C) and Blue (D-F) */}
            <line
              x1="200"
              y1="20"
              x2="200"
              y2="356"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Column Labels A-F */}
            {COLS.map((col, idx) => {
              const cx = 32 + idx * 56 + 28;
              const cy = rotated ? 364 : 11;
              return (
                <text
                  key={col}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255, 255, 255, 0.42)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="var(--font-telemetry)"
                  transform={uprightText(cx, cy)}
                >
                  {col}
                </text>
              );
            })}

            {/* Row Labels 6-1 */}
            {ROWS.map((row, idx) => {
              const cx = rotated ? 358 : 22;
              const cy = 20 + idx * 56 + 28;
              return (
                <text
                  key={row}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255, 255, 255, 0.48)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="var(--font-telemetry)"
                  transform={uprightText(cx, cy)}
                >
                  {row}
                </text>
              );
            })}

            {/* RED LOADING ZONE (Tile A5, 11 in wide = ~27px) */}
            <g>
              <rect
                x="32"
                y="76"
                width="27"
                height="56"
                fill="rgba(239, 68, 68, 0.14)"
                stroke="#EF4444"
                strokeWidth="2"
              />
              <text
                x="45.5"
                y="104"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FCA5A5"
                fontSize="8.5"
                fontWeight="800"
                transform={uprightText(45.5, 104)}
              >
                LZ
              </text>
            </g>

            {/* BLUE LOADING ZONE (Tile F2, 11 in wide = ~27px) */}
            <g>
              <rect
                x="341"
                y="244"
                width="27"
                height="56"
                fill="rgba(59, 130, 246, 0.14)"
                stroke="#3B82F6"
                strokeWidth="2"
              />
              <text
                x="354.5"
                y="272"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#93C5FD"
                fontSize="8.5"
                fontWeight="800"
                transform={uprightText(354.5, 272)}
              >
                LZ
              </text>
            </g>

            {/* RED GARDEN (Bottom edge of A1) + 4 staged Pollen */}
            <g>
              <rect x="33" y="351" width="54" height="4" fill="#EF4444" rx="1" />
              {[42, 51, 60, 69].map((px) => (
                <circle key={px} cx={px} cy="348" r="2.6" fill="#FACC15" />
              ))}
            </g>

            {/* BLUE GARDEN (Top edge of F6) + 4 staged Pollen */}
            <g>
              <rect x="313" y="21" width="54" height="4" fill="#3B82F6" rx="1" />
              {[331, 340, 349, 358].map((px) => (
                <circle key={px} cx={px} cy="28" r="2.6" fill="#FACC15" />
              ))}
            </g>

            {/* 4 PERIMETER FLOWERS */}
            {[
              { cx: 134, cy: 26, label: 'Top Flower' },
              { cx: 38, cy: 200, label: 'Left Flower' },
              { cx: 362, cy: 176, label: 'Right Flower' },
              { cx: 266, cy: 350, label: 'Bottom Flower' },
            ].map((flower) => (
              <g key={flower.label}>
                <circle
                  cx={flower.cx}
                  cy={flower.cy}
                  r="8"
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="#10B981"
                  strokeWidth="1.6"
                />
                <circle cx={flower.cx} cy={flower.cy} r="3" fill="#FACC15" />
              </g>
            ))}

            {/* CENTRAL HIVES (2x2 tiles: C3, C4, D3, D4 => x=144..256, y=132..244) */}
            <g>
              {/* Frame base */}
              <rect
                x="152"
                y="140"
                width="96"
                height="96"
                rx="4"
                fill="#070733"
                stroke="#451F66"
                strokeWidth="1.5"
              />
              {/* Red Hive Baskets (left) */}
              <rect
                x="156"
                y="145"
                width="39"
                height="38"
                rx="3"
                fill="rgba(239, 68, 68, 0.16)"
                stroke="#EF4444"
                strokeWidth="1.6"
              />
              <rect
                x="156"
                y="193"
                width="39"
                height="38"
                rx="3"
                fill="rgba(239, 68, 68, 0.16)"
                stroke="#EF4444"
                strokeWidth="1.6"
              />
              {/* Blue Hive Baskets (right) */}
              <rect
                x="205"
                y="145"
                width="39"
                height="38"
                rx="3"
                fill="rgba(59, 130, 246, 0.16)"
                stroke="#3B82F6"
                strokeWidth="1.6"
              />
              <rect
                x="205"
                y="193"
                width="39"
                height="38"
                rx="3"
                fill="rgba(59, 130, 246, 0.16)"
                stroke="#3B82F6"
                strokeWidth="1.6"
              />
              {/* Center bar & label */}
              <rect x="155" y="185" width="90" height="6" rx="1" fill="#451F66" />
              <text
                x="200"
                y="188"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize="8"
                fontWeight="900"
                letterSpacing="1"
                fontFamily="var(--font-telemetry)"
                transform={uprightText(200, 188)}
              >
                HIVES
              </text>
            </g>

            {/* CLICKABLE VALID ROBOT STARTING ZONES FOR ACTIVE ALLIANCE */}
            {zones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              const { cx, cy } = zone;

              return (
                <g
                  key={zone.id}
                  onClick={() => onChange(zone.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar posición inicial ${zone.id} (${zone.label})`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(zone.id);
                    }
                  }}
                >
                  <path
                    d={zone.path}
                    fill={isSelected ? 'rgba(237, 184, 36, 0.16)' : allianceGlow}
                    stroke={isSelected ? '#EDB824' : allianceColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? undefined : '4 3'}
                  />
                  <g transform={uprightText(cx, cy)}>
                    <text
                      x={cx}
                      y={isSelected ? cy - 6 : cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isSelected ? '#EDB824' : '#FFFFFF'}
                      fontSize="13"
                      fontWeight="900"
                      fontFamily="var(--font-telemetry)"
                    >
                      {zone.id}
                    </text>
                    {isSelected && (
                      <text
                        x={cx}
                        y={cy + 9}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#FFFFFF"
                        fontSize="7.5"
                        fontWeight="800"
                        fontFamily="var(--font-telemetry)"
                      >
                        {teamNumber ? `#${teamNumber}` : 'ROBOT'}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

