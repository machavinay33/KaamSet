import { ArrowDown, ArrowUp } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { formatINR } from '@/lib/format';
import { moveServiceAction, saveCategoryAction, setServiceFlagAction } from '@/app/admin/actions';

export const metadata = { title: 'Services', robots: { index: false } };

export default async function ServicesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const flash = flashFrom(await searchParams);
  const { supabase } = await requireAdmin();
  const [s, c] = await Promise.all([
    supabase.from('services').select('*').order('sort_order').order('name'),
    supabase.from('service_categories').select('*').order('sort_order').order('name'),
  ]);
  const services = (s.data ?? []) as any[]; const cats = (c.data ?? []) as any[];
  const flag = (id: string, f: string, v: boolean) => (
    <><input type="hidden" name="id" value={id} /><input type="hidden" name="flag" value={f} /><input type="hidden" name="value" value={String(v)} /></>
  );
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Services</h1>
      <Flash {...flash} />
      <details className="card p-5"><summary className="cursor-pointer text-base font-semibold">Add a service</summary><div className="mt-4"><ServiceForm categories={cats} /></div></details>

      <section className="space-y-3" aria-label="Service list">
        {services.length === 0 && <p className="card p-8 text-center text-ink-600">No services yet. Add your first service above.</p>}
        {services.map((sv, i) => (
          <article key={sv.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold">{sv.name}</h2><p className="text-sm text-ink-600">{formatINR(sv.price_inr)} · {sv.is_active ? 'Visible' : 'Hidden'} · {sv.is_bookable ? 'Open for booking' : 'Booking paused'}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={moveServiceAction}><input type="hidden" name="id" value={sv.id} /><input type="hidden" name="dir" value="up" /><button className="btn-secondary btn-sm" aria-label={`Move ${sv.name} up`} disabled={i === 0}><ArrowUp className="h-4 w-4" aria-hidden /></button></form>
                <form action={moveServiceAction}><input type="hidden" name="id" value={sv.id} /><input type="hidden" name="dir" value="down" /><button className="btn-secondary btn-sm" aria-label={`Move ${sv.name} down`} disabled={i === services.length - 1}><ArrowDown className="h-4 w-4" aria-hidden /></button></form>
                <ConfirmForm action={setServiceFlagAction} variant="secondary" label={sv.is_bookable ? 'Pause booking' : 'Resume booking'} title={sv.is_bookable ? 'Pause bookings for this service?' : 'Resume bookings?'} description="Existing bookings are not affected." confirmLabel="Yes, continue">{flag(sv.id, 'is_bookable', !sv.is_bookable)}</ConfirmForm>
                <ConfirmForm action={setServiceFlagAction} variant={sv.is_active ? 'danger' : 'secondary'} label={sv.is_active ? 'Deactivate' : 'Activate'} title={sv.is_active ? 'Hide this service from the website?' : 'Show this service on the website?'} description="Existing bookings keep their original service name and price." confirmLabel="Yes, continue">{flag(sv.id, 'is_active', !sv.is_active)}</ConfirmForm>
              </div>
            </div>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-brand-800">Edit details</summary><div className="mt-4 border-t border-line pt-4"><ServiceForm service={sv} categories={cats} /></div></details>
          </article>
        ))}
      </section>

      <section aria-labelledby="cat-h" className="space-y-3"><h2 id="cat-h" className="text-lg font-semibold">Categories</h2>
        {cats.map((ct) => (
          <form key={ct.id} action={saveCategoryAction} className="card flex flex-wrap items-end gap-3 p-4"><input type="hidden" name="id" value={ct.id} />
            <div><label className="label" htmlFor={`cn-${ct.id}`}>Name</label><input id={`cn-${ct.id}`} name="name" defaultValue={ct.name} required className="input" /></div>
            <div><label className="label" htmlFor={`co-${ct.id}`}>Order</label><input id={`co-${ct.id}`} name="sort_order" type="number" min="0" defaultValue={ct.sort_order} className="input w-24" /></div>
            <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={ct.is_active} className="h-4 w-4 accent-orange-600" /> Active</label>
            <button className="btn-secondary btn-sm mb-1" type="submit">Save</button></form>
        ))}
        <form action={saveCategoryAction} className="card flex flex-wrap items-end gap-3 p-4"><div><label className="label" htmlFor="newcat">New category</label><input id="newcat" name="name" required minLength={2} className="input" /></div>
          <input type="hidden" name="sort_order" value={(cats.length + 1) * 10} /><input type="hidden" name="is_active" value="on" /><button className="btn-primary btn-sm mb-1" type="submit">Add category</button></form>
      </section>
    </div>
  );
}
