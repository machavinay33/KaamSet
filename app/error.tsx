'use client';
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-ink-600">This is on our side. Your data is safe. Please try again.</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </main>
  );
}
