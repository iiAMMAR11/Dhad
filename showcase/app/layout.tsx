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
    description: 'مهارة تضيفها إلى Claude أو ChatGPT، لتصنع أعمالك بعربية صحيحة واتجاه سليم.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ضاد، عمل أوضح وعربية أفضل' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dhad',
    description: 'مهارة تضيفها إلى Claude أو ChatGPT، لتصنع أعمالك بعربية صحيحة واتجاه سليم.',
    creator: '@iiAMMAR11',
    images: ['/og.png'],
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
