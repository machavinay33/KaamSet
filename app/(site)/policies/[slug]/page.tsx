import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/data/public';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
const POLICIES: Record<string, { key: string; title: string; description: string }> = {
  terms: { key: 'policy.terms', title: 'Service terms', description: 'Read the service terms for booking home services with KaamSet in MIHAN, Nagpur.' },
  privacy: { key: 'policy.privacy', title: 'Privacy policy', description: 'Learn how KaamSet handles information submitted when requesting home services in MIHAN.' },
  cancellation: { key: 'policy.cancellation', title: 'Cancellation policy', description: 'Review KaamSet cancellation and rescheduling rules for home-service bookings in MIHAN.' },
  payment: { key: 'policy.payment', title: 'Payment information', description: 'See how payment works for KaamSet home services in MIHAN, Nagpur.' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();
  return pageMetadata(policy.title, policy.description, `/policies/${slug}`);
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = POLICIES[slug];
  if (!p) notFound();
  const s = await getSettings();
  const text = String(s[p.key] ?? '').trim();
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold">{p.title}</h1>
      {slug === 'payment' && <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-ink-800">{String(s['payments.note'])} Accepted after service: {(s['payments.methods'] as string[]).join(', ') || 'to be confirmed by the team'}.</p>}
      {slug === 'cancellation' && <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-ink-800">Online cancellation: {s['cancellation.customer_allowed'] ? `until ${s['cancellation.min_hours_before']} hours before your requested time` : 'not available, please contact us'}. Online rescheduling: {s['reschedule.customer_allowed'] ? `until ${s['reschedule.min_hours_before']} hours before your requested time` : 'not available, please contact us'}.</p>}
      <div className="mt-6 whitespace-pre-line leading-relaxed text-ink-700">{text || 'This policy has not been published yet.'}</div>
    </div>
  );
}
