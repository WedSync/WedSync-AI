import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './providers';
import { RootLayoutProps } from '@/types/next15-params';
import { CriticalErrorBoundary } from '@/components/error-boundary';
import CookieConsentBanner from '@/components/privacy/CookieConsentBanner';
import { MonitoringProvider } from '@/components/monitoring/MonitoringProvider';
import '@/styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WedSync - Wedding Planning Made Simple',
  description:
    'Plan your perfect wedding with WedSync. Manage vendors, guests, timeline, and more in one beautiful platform.',
  manifest: '/manifest.json',
  themeColor: '#F0A1AA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WedSync',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'WedSync',
    title: 'WedSync - Wedding Planning Made Simple',
    description: 'Plan your perfect wedding with WedSync',
  },
  twitter: {
    card: 'summary',
    title: 'WedSync - Wedding Planning Made Simple',
    description: 'Plan your perfect wedding with WedSync',
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  // Extract async params if needed (root layout typically doesn't use them)
  const resolvedParams = await params;
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <CriticalErrorBoundary
          context={{
            app: 'WedSync',
            version: '2.0',
            environment: process.env.NODE_ENV,
          }}
        >
          <Providers>
            <MonitoringProvider>
              {children}
              <CookieConsentBanner />
            </MonitoringProvider>
          </Providers>
        </CriticalErrorBoundary>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
