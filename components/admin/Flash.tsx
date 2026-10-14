export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div role={err ? 'alert' : 'status'} className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${err ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{err ?? ok}</div>
  );
}
export const flashFrom = (sp: Record<string, string | string[] | undefined>) => ({
  ok: typeof sp.ok === 'string' ? sp.ok.slice(0, 200) : undefined,
  err: typeof sp.err === 'string' ? sp.err.slice(0, 200) : undefined,
});
