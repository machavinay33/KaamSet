import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <Image src="/logo-header.png" alt="KaamSet" width={180} height={48} priority />
      <h1 className="text-3xl font-bold">We could not find that page</h1>
      <p className="max-w-md text-ink-600">The link may be old or mistyped. You can head back home or book a service.</p>
      <div className="flex gap-3"><Link href="/" className="btn-secondary">Go home</Link><Link href="/book" className="btn-primary">Book a service</Link></div>
    </main>
  );
}
