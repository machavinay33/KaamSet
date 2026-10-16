import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/services', '/book', '/contact', '/policies/terms', '/policies/privacy', '/policies/cancellation', '/policies/payment'];
  return paths.map((path) => ({ url: new URL(path, `${SITE_URL}/`).toString(), changeFrequency: 'weekly' as const }));
}
