import type { Metadata, Viewport } from 'next';
import '@ibm/plex-sans-arabic/css/ibm-plex-sans-arabic-all.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://dhad.iiammar.com'),
  title: 'ضاد | عمل أوضح وعربية أفضل',
  description: 'ضاد تساعدك على تحسين المواقع والتطبيقات والعروض وملفات PDF والصور والإعلانات، مع عربية واضحة واتجاه صحيح.',
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: '/',
    siteName: 'Dhad',
    title: 'Dhad',
    description: 'مواقع وملفات وصور أوضح، مع عربية مريحة واتجاه صحيح.',
  },
  twitter: {
    card: 'summary',
    title: 'Dhad',
    description: 'مواقع وملفات وصور أوضح، مع عربية مريحة واتجاه صحيح.',
    creator: '@iiAMMAR11',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#151515' },
    { media: '(prefers-color-scheme: light)', color: '#1557d5' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
