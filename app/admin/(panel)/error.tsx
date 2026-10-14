'use client';
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <div role="alert" className="card p-8 text-center"><h2 className="text-lg font-semibold">Could not load this page</h2><p className="mt-1 text-sm text-ink-600">Check your connection and try again.</p><button className="btn-primary mt-4" onClick={reset}>Retry</button></div>;
}
