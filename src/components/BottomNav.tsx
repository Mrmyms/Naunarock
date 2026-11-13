'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MatchPhase, useMatchPhase } from '@/context/MatchPhaseContext';

const PHASE_OPTIONS: { id: MatchPhase; label: string }[] = [
  { id: 'auto', label: 'Autónomo' },
  { id: 'teleop', label: 'TeleOp' },
  { id: 'endgame', label: 'Endgame' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { currentTab, setCurrentTab } = useMatchPhase();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isMatchPage = pathname === '/';
  const activePhaseLabel =
    PHASE_OPTIONS.find((p) => p.id === currentTab)?.label ?? 'Autónomo';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [menuOpen]);

  const handleSelectPhase = (phase: MatchPhase) => {
    setCurrentTab(phase);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const matchIcon = (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <path d="M6 12h4m-2-2v4" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
    </svg>
  );

  return (
    <nav ref={navRef} className="bottom-nav" style={{ position: 'fixed' }}>
      {/* Menú desplegable de fases sobre el botón Match */}
      {isMatchPage && menuOpen && (
        <div
          role="menu"
          aria-label="Seleccionar fase del Match"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '12px',
            minWidth: '172px',
            padding: '6px',
            borderRadius: '18px',
            background: 'linear-gradient(180deg, rgba(22, 14, 48, 0.96) 0%, rgba(5, 5, 32, 0.98) 100%)',
            border: '1px solid rgba(237, 184, 36, 0.28)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 300,
          }}
        >
          {PHASE_OPTIONS.map((phase) => {
            const isActive = currentTab === phase.id;
            return (
              <button
                key={phase.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelectPhase(phase.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${isActive ? 'var(--nautilus-gold)' : 'transparent'}`,
                  background: isActive ? 'rgba(237, 184, 36, 0.16)' : 'transparent',
                  color: isActive ? 'var(--nautilus-gold)' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{phase.label}</span>
                {isActive && (
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--nautilus-gold)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {isMatchPage ? (
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`nav-link active`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {matchIcon}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {activePhaseLabel}
            <span style={{ fontSize: '9px', opacity: 0.9 }}>{menuOpen ? '▾' : '▴'}</span>
          </span>
        </button>
      ) : (
        <Link href="/" className="nav-link">
          {matchIcon}
          <span>Match</span>
        </Link>
      )}

      <Link href="/pit" className={`nav-link ${pathname === '/pit' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span>Pit</span>
      </Link>

      <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}
