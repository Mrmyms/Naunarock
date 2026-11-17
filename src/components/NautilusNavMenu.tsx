'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Match Scouting',
    sublabel: 'Captura en cancha',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <path d="M6 12h4m-2-2v4" />
        <circle cx="17" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/pit',
    label: 'Pit Scouting',
    sublabel: 'Inspección de robot',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    sublabel: 'Métricas y rankings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function NautilusNavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="user-profile-badge"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menú de navegación Nautilus 4010"
      >
        <img
          src="/brand/nautilus-logo.png"
          alt="Logo Nautilus 4010"
          style={{ width: '26px', height: '34px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          <div
            style={{
              fontSize: 'clamp(13px, 3.8vw, 17px)',
              fontWeight: 700,
              color: 'var(--nautilus-white)',
              letterSpacing: '0.4px',
              whiteSpace: 'nowrap',
            }}
          >
            NAUTILUS <span style={{ fontWeight: 500 }} className="mono-tabular">4010</span>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--nautilus-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            minWidth: '216px',
            background: '#070733',
            border: '2px solid #451F66',
            borderRadius: '4px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 300,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 10px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(69, 31, 102, 0.55)' : 'transparent',
                  border: `1px solid ${isActive ? '#EDB824' : 'transparent'}`,
                  color: isActive ? '#EDB824' : '#FFFFFF',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0.75 }}>
                  {item.icon}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--nautilus-gray)' }}>{item.sublabel}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

