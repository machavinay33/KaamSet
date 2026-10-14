import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return ['', '/services', '/book', '/contact', '/policies/terms', '/policies/privacy', '/policies/cancellation', '/policies/payment'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const }));
}
