'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatTime } from '@/lib/format';
import { messageFor } from '@/lib/booking/messages';

type SlotOpt = { id: string; label: string; start_time: string; end_time: string; remaining: number; available: boolean; reason: string | null };
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; status: string; slots: SlotOpt[] };

export function SlotPicker({ serviceId, date, value, onChange, refreshKey = 0 }: {
  serviceId: string; date: string; value: string; onChange: (id: string) => void; refreshKey?: number;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!serviceId || !date) { setState({ kind: 'idle' }); return; }
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`, { signal });
      if (!res.ok) throw new Error('bad status');
      const json = await res.json();
      setState({ kind: 'ready', status: json.status, slots: json.slots });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setState({ kind: 'error' });
    }
  }, [serviceId, date]);

  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load, refreshKey]);

  useEffect(() => {
    if (state.kind === 'ready' && value && !state.slots.some((s) => s.id === value && s.available)) onChange('');
  }, [state, value, onChange]);

  if (state.kind === 'idle') return <p className="text-sm text-ink-500">Choose a service and date to see available slots.</p>;
  if (state.kind === 'loading') return <p className="flex items-center gap-2 text-sm text-ink-600" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking availability...</p>;
  if (state.kind === 'error') return <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Could not check availability. <button type="button" className="font-semibold underline" onClick={() => load()}>Try again</button></div>;
  if (state.status !== 'ok') return <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{state.status === 'no_slots' ? 'No slots are set up for this service yet.' : messageFor(state.status === 'slot_full' ? 'slot_full' : state.status)}</p>;

  return (
    <div role="radiogroup" aria-label="Time slot" className="grid gap-2 sm:grid-cols-3">
      {state.slots.map((s) => {
        const selected = value === s.id;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={selected} disabled={!s.available} onClick={() => onChange(s.id)}
            className={`min-h-[56px] rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-400 ${selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500' : 'border-line bg-white hover:bg-brand-50'}`}>
            <span className="block font-semibold text-ink-900">{s.label}</span>
            <span className="block text-xs text-ink-600">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
            <span className="block text-xs text-ink-500">{s.available ? (s.remaining <= 2 ? `${s.remaining} left` : 'Available') : s.reason === 'slot_full' ? 'Full' : 'Unavailable'}</span>
          </button>
        );
      })}
    </div>
  );
}
