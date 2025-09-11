import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './providers';
import { RootLayoutProps } from '@/types/next15-params';
import { CriticalErrorBoundary } from '@/components/error-boundary';
import CookieConsentBanner from '@/components/privacy/CookieConsentBanner';
import { MonitoringProvider } from '@/components/monitoring/MonitoringProvider';
import './globals.css';

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
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <CriticalErrorBoundary>
          <MonitoringProvider>
            <Providers>
              {children}
              <CookieConsentBanner />
            </Providers>
          </MonitoringProvider>
        </CriticalErrorBoundary>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}