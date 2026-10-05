import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/session';
import { THEME_BOOT } from '@/lib/theme';

import './globals.css';

const sans = Schibsted_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-schibsted', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DRAW: private capital calls on Canton', template: '%s | DRAW' },
  description: 'Each investor sees and pays only its own capital call. The fund sees what is verifiably funded, settled with Canton Coin on the Canton Network.',
  openGraph: { title: 'DRAW', description: 'Private capital calls, settled and verified on Canton.' },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1412' },
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
