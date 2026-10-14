import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Outfit({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'KaamSet - Home chores, sorted.', template: '%s | KaamSet' },
  description: 'Book trusted home services for residents of Shiv Kailasa Society, Nagpur. Clear pricing, simple booking, pay after service.',
  openGraph: {
    title: 'KaamSet - Home chores, sorted.',
    description: 'Home services exclusively for Shiv Kailasa Society residents, Nagpur.',
    siteName: 'KaamSet', type: 'website', locale: 'en_IN',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KaamSet - Home chores, sorted.' }],
  },
  twitter: { card: 'summary_large_image', title: 'KaamSet - Home chores, sorted.', images: ['/og.png'] },
};
export const viewport: Viewport = { themeColor: '#FFFBF7', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
