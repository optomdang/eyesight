import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ZaloFab } from '@/components/layout/ZaloFab';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { site } from '@/content/site';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    'nhược thị',
    'tập thị lực',
    'vision therapy',
    'phòng khám nhãn khoa',
    'D-VisUp',
    'nhuocthi',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [{ url: '/images/og-image.svg', width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ['/images/og-image.svg'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/images/logo-mark.png', type: 'image/png' }],
    apple: [{ url: '/images/logo-mark.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="font-sans">
        <ClientProviders>
          <Header />
          <main>{children}</main>
          <Footer />
          <ZaloFab />
        </ClientProviders>
      </body>
    </html>
  );
}
