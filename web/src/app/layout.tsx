import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/session';
import { THEME_BOOT } from '@/lib/theme';

import './globals.css';

const sans = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DRAW: private capital calls on Canton', template: '%s | DRAW' },
  description: 'Each LP sees and pays only its own capital call, and the fund counts only what a read-back confirms on the ledger. Live on Canton DevNet with test Canton Coin.',
  openGraph: { title: 'DRAW', description: 'Private capital calls, settled and verified on Canton.' },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1210' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
