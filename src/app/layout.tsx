import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'NAUTILUS 4010 • Building a Legacy | Scouting FTC',
  description: 'Sistema Oficial de Scouting y Telemetría para FIRST Tech Challenge BIOBUZZ - Nautilus 4010',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preload"
          href="/fonts/hkgrotesk-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/hkgrotesk-bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <div className="app-viewport">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
