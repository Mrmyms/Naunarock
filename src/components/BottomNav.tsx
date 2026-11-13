'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="3" />
          <path d="M6 12h4m-2-2v4" />
          <circle cx="17" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
        </svg>
        <span>Match</span>
      </Link>
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
