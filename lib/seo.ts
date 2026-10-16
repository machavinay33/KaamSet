import type { Metadata } from 'next';

// The custom domain redirects the apex to www, so www is the single canonical origin.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.kaamset.online').replace(/\/+$/, '');

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, `${SITE_URL}/`).toString();
  const image = new URL('/og.png', `${SITE_URL}/`).toString();
  const brandedTitle = `${title} | KaamSet`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: brandedTitle,
      description,
      url,
      siteName: 'KaamSet',
      type: 'website',
      locale: 'en_IN',
      images: [{ url: image, width: 1200, height: 630, alt: 'KaamSet home services in MIHAN, Nagpur' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
      images: [image],
    },
  };
}
