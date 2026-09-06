import type { Metadata, Viewport } from 'next';
import '@ibm/plex-sans-arabic/css/ibm-plex-sans-arabic-all.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://dhad.iiammar.com'),
  title: 'ضاد | تجربة وايت ليبل بعربية متفوّقة',
  description: 'ضاد مهارة تحسّن تجربة المنتجات والمواقع والتطبيقات والعروض والمستندات، وتجعل العربية وRTL جزءًا أصيلًا منها.',
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
    description: 'تجربة أفضل لكل مخرج، وعربية وRTL من الدرجة الأولى.',
  },
  twitter: {
    card: 'summary',
    title: 'Dhad',
    description: 'تجربة أفضل لكل مخرج، وعربية وRTL من الدرجة الأولى.',
    creator: '@iiAMMAR11',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1e' },
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
