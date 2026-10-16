import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/seo';

const display = Outfit({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Home Services in MIHAN, Nagpur', template: '%s | KaamSet' },
  description: 'Book home cleaning and everyday household services across MIHAN, Nagpur. Choose a service and request a preferred time.',
  openGraph: {
    title: 'Home Services in MIHAN, Nagpur | KaamSet',
    description: 'Book home cleaning and everyday household services across MIHAN, Nagpur.',
    url: new URL('/', `${SITE_URL}/`).toString(), siteName: 'KaamSet', type: 'website', locale: 'en_IN',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KaamSet home services in MIHAN, Nagpur' }],
  },
  twitter: { card: 'summary_large_image', title: 'Home Services in MIHAN, Nagpur | KaamSet', description: 'Book home cleaning and everyday household services across MIHAN, Nagpur.', images: ['/og.png'] },
};
export const viewport: Viewport = { themeColor: '#FFFBF7', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
