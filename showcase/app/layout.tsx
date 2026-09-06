import type { Metadata, Viewport } from 'next';
import '@ibm/plex-sans-arabic/css/ibm-plex-sans-arabic-all.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://dhad.iiammar.com'),
  title: 'Dhad | تصميم عربي وصحة عربية',
  description: 'ضاد سكيل للواجهات العربية يجمع تصميم RTL مع الجمع والبحث والترتيب والأرقام والتقويم المحلي.',
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
    description: 'ضاد يجعل الواجهة تبدو عربية وتتصرف بالعربية.',
  },
  twitter: {
    card: 'summary',
    title: 'Dhad',
    description: 'ضاد يجعل الواجهة تبدو عربية وتتصرف بالعربية.',
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
    <html lang="ar" dir="rtl" data-dhad-theme="dark" suppressHydrationWarning>
      <body className="dhad-app">{children}</body>
    </html>
  );
}
