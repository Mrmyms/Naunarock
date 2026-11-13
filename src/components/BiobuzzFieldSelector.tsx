'use client';

import React, { useState } from 'react';

export interface StartZone {
  id: string;
  code: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const RED_START_ZONES: StartZone[] = [
  { id: 'A6 · Esq. Sup.', code: 'A6', label: 'Esq. Sup.', x: 35, y: 23, w: 51, h: 49 },
  { id: 'C6 · Centro Sup.', code: 'C6', label: 'Centro Sup.', x: 147, y: 23, w: 50, h: 47 },
  { id: 'A2 · Pared Lat.', code: 'A2', label: 'Pared Lat.', x: 35, y: 222, w: 49, h: 74 },
  { id: 'A1 · Garden', code: 'A1', label: 'Garden', x: 35, y: 299, w: 53, h: 48 },
  { id: 'C1 · Audience', code: 'C1', label: 'Audience', x: 120, y: 304, w: 77, h: 49 },
];

export const BLUE_START_ZONES: StartZone[] = [
  { id: 'D6 · Centro Sup.', code: 'D6', label: 'Centro Sup.', x: 203, y: 23, w: 77, h: 47 },
  { id: 'F6 · Garden', code: 'F6', label: 'Garden', x: 312, y: 24, w: 53, h: 48 },
  { id: 'F5 · Pared Lat.', code: 'F5', label: 'Pared Lat.', x: 316, y: 78, w: 49, h: 74 },
  { id: 'F1 · Esq. Inf.', code: 'F1', label: 'Esq. Inf.', x: 314, y: 304, w: 51, h: 49 },
  { id: 'D1 · Audience', code: 'D1', label: 'Audience', x: 203, y: 304, w: 50, h: 49 },
];

interface BiobuzzFieldSelectorProps {
  alliance: 'blue' | 'red';
  value: string;
  teamNumber?: number;
  onChange: (pos: string) => void;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS = ['6', '5', '4', '3', '2', '1'];

export default function BiobuzzFieldSelector({
  alliance,
  value,
  teamNumber,
  onChange,
}: BiobuzzFieldSelectorProps) {
  const [rotated, setRotated] = useState(false);

  const zones = alliance === 'red' ? RED_START_ZONES : BLUE_START_ZONES;
  const allianceColor = alliance === 'red' ? '#EF4444' : '#3B82F6';
  const allianceGlow = alliance === 'red' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)';
  const selectedZone = zones.find((z) => z.id === value) ?? zones[0];

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
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--nautilus-gold)' }}>
            {selectedZone.id}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRotated((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '12px',
            background: rotated ? 'rgba(237, 184, 36, 0.16)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${rotated ? 'var(--nautilus-gold)' : 'rgba(255, 255, 255, 0.14)'}`,
            color: rotated ? 'var(--nautilus-gold)' : 'var(--nautilus-gray)',
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
          borderRadius: '18px',
          padding: '8px',
          background: 'rgba(1, 1, 36, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
        }}
      >
        <svg
          viewBox="0 0 384 388"
          width="100%"
          style={{ display: 'block', userSelect: 'none', touchAction: 'manipulation' }}
          role="img"
          aria-label="Mapa interactivo de cancha FTC BIOBUZZ 6 por 6"
        >
          <defs>
            <filter id="goldGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#EDB824" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Top / Bottom Audience orientation label */}
          <text
            x="200"
            y={rotated ? 13 : 378}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.42)"
            fontSize="10"
            fontWeight="800"
            letterSpacing="2"
          >
            AUDIENCE
          </text>

          {/* Rotatable Field Group */}
          <g transform={fieldTransform}>
            {/* Outer Field Perimeter */}
            <rect
              x="32"
              y="20"
              width="336"
              height="336"
              rx="6"
              fill="#07072B"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="2"
            />

            {/* 6x6 Tile Checkerboard + Grid Seams */}
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
                    fill={isAlt ? 'rgba(255, 255, 255, 0.025)' : 'rgba(255, 255, 255, 0.055)'}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="0.8"
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
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Column Labels A-F */}
            {COLS.map((col, idx) => {
              const cx = 32 + idx * 56 + 28;
              const cy = rotated ? 348 : 31;
              return (
                <text
                  key={col}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.22)"
                  fontSize="9"
                  fontWeight="700"
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
                  fill="rgba(255,255,255,0.32)"
                  fontSize="9"
                  fontWeight="700"
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
                rx="8"
                fill="rgba(255, 255, 255, 0.04)"
                stroke="rgba(255, 255, 255, 0.24)"
                strokeWidth="1.5"
              />
              {/* Red Hive Baskets (left) */}
              <rect
                x="156"
                y="145"
                width="39"
                height="38"
                rx="5"
                fill="rgba(239, 68, 68, 0.16)"
                stroke="#EF4444"
                strokeWidth="1.6"
              />
              <rect
                x="156"
                y="193"
                width="39"
                height="38"
                rx="5"
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
                rx="5"
                fill="rgba(59, 130, 246, 0.16)"
                stroke="#3B82F6"
                strokeWidth="1.6"
              />
              <rect
                x="205"
                y="193"
                width="39"
                height="38"
                rx="5"
                fill="rgba(59, 130, 246, 0.16)"
                stroke="#3B82F6"
                strokeWidth="1.6"
              />
              {/* Center bar & label */}
              <rect x="155" y="185" width="90" height="6" rx="2" fill="rgba(237, 184, 36, 0.35)" />
              <text
                x="200"
                y="188"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize="8"
                fontWeight="900"
                letterSpacing="1"
                transform={uprightText(200, 188)}
              >
                HIVES
              </text>
            </g>

            {/* CLICKABLE VALID ROBOT STARTING ZONES FOR ACTIVE ALLIANCE */}
            {zones.map((zone) => {
              const isSelected = selectedZone.id === zone.id;
              const cx = zone.x + zone.w / 2;
              const cy = zone.y + zone.h / 2;

              return (
                <g
                  key={zone.id}
                  onClick={() => onChange(zone.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar posición inicial ${zone.id}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(zone.id);
                    }
                  }}
                >
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx="7"
                    fill={isSelected ? 'rgba(237, 184, 36, 0.28)' : allianceGlow}
                    stroke={isSelected ? '#EDB824' : allianceColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? undefined : '4 3'}
                    filter={isSelected ? 'url(#goldGlow)' : undefined}
                  />
                  <g transform={uprightText(cx, cy)}>
                    <text
                      x={cx}
                      y={isSelected ? cy - 5 : cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isSelected ? '#EDB824' : '#FFFFFF'}
                      fontSize="11"
                      fontWeight="900"
                    >
                      {zone.code}
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

