import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { saveWorkerAction } from '@/app/admin/actions';

export const metadata = { title: 'Workers', robots: { index: false } };

function WorkerForm({ w, services, selected = [] }: { w?: any; services: any[]; selected?: string[] }) {
  const k = w?.id ?? 'new';
  return (
    <form action={saveWorkerAction} className="space-y-3">{w && <input type="hidden" name="id" value={w.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor={`n-${k}`}>Name</label><input id={`n-${k}`} name="name" required defaultValue={w?.name} className="input" /></div>
        <div><label className="label" htmlFor={`p-${k}`}>Phone <span className="font-normal text-ink-500">(admin only)</span></label><input id={`p-${k}`} name="phone" maxLength={20} defaultValue={w?.phone ?? ''} className="input" /></div></div>
      <div><label className="label" htmlFor={`o-${k}`}>Notes</label><input id={`o-${k}`} name="notes" maxLength={500} defaultValue={w?.notes ?? ''} className="input" /></div>
      <fieldset><legend className="label">Services this worker can do</legend><div className="flex flex-wrap gap-3">{services.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="service_ids" value={s.id} defaultChecked={selected.includes(s.id)} className="h-4 w-4 accent-orange-600" />{s.name}</label>)}</div></fieldset>
      <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={w ? w.is_active : true} className="h-4 w-4 accent-orange-600" /> Active</label><button className="btn-primary btn-sm" type="submit">{w ? 'Save worker' : 'Add worker'}</button></div>
    </form>
  );
}

export default async function WorkersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const flash = flashFrom(await searchParams);
  const { supabase } = await requireAdmin();
  const [w, s, ws] = await Promise.all([supabase.from('workers').select('*').order('name'), supabase.from('services').select('id, name').order('name'), supabase.from('worker_services').select('worker_id, service_id')]);
  const map = new Map<string, string[]>(); (ws.data ?? []).forEach((r: any) => map.set(r.worker_id, [...(map.get(r.worker_id) ?? []), r.service_id]));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workers</h1><Flash {...flash} />
      <p className="text-sm text-ink-600">Worker details are visible to admins only and are never shown to customers.</p>
      {(w.data ?? []).map((x: any) => <details key={x.id} className="card p-4"><summary className="cursor-pointer font-semibold">{x.name} <span className="text-sm font-normal text-ink-600">{x.is_active ? 'Active' : 'Inactive'}</span></summary><div className="mt-4 border-t border-line pt-4"><WorkerForm w={x} services={s.data ?? []} selected={map.get(x.id) ?? []} /></div></details>)}
      {(w.data ?? []).length === 0 && <p className="card p-8 text-center text-ink-600">No workers added yet.</p>}
      <details className="card p-4"><summary className="cursor-pointer font-semibold">Add a worker</summary><div className="mt-4"><WorkerForm services={s.data ?? []} /></div></details>
    </div>
  );
}
