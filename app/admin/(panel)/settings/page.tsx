import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { PAYMENT_METHODS, SETTING_FIELDS, defaultSettings } from '@/lib/settings-schema';
import { saveSettingsAction } from '@/app/admin/actions';

export const metadata = { title: 'Settings', robots: { index: false } };

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const flash = flashFrom(await searchParams);
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('business_settings').select('key, value');
  const values: Record<string, any> = defaultSettings();
  (data ?? []).forEach((r: any) => { if (r.key in values) values[r.key] = r.value; });
  const groups = [...new Set(SETTING_FIELDS.map((f) => f.group))];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1><Flash {...flash} />
      <form action={saveSettingsAction} className="space-y-6">
        {groups.map((g) => (
          <fieldset key={g} className="card space-y-4 p-5"><legend className="px-1 text-base font-semibold">{g}</legend>
            {SETTING_FIELDS.filter((f) => f.group === g).map((f) => {
              const v = values[f.key];
              if (f.type === 'bool') return <label key={f.key} className="flex items-start gap-3 text-sm"><input type="checkbox" name={f.key} defaultChecked={v === true} className="mt-0.5 h-5 w-5 accent-orange-600" /><span><span className="font-medium">{f.label}</span>{f.help && <span className="block text-ink-500">{f.help}</span>}</span></label>;
              if (f.type === 'methods') return <fieldset key={f.key}><legend className="label">{f.label}</legend><div className="flex flex-wrap gap-4">{PAYMENT_METHODS.map((m) => <label key={m.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name={f.key} value={m.value} defaultChecked={(v as string[]).includes(m.value)} className="h-4 w-4 accent-orange-600" />{m.label}</label>)}</div></fieldset>;
              return (
                <div key={f.key}><label className="label" htmlFor={f.key}>{f.label}</label>
                  {f.type === 'textarea' ? <textarea id={f.key} name={f.key} rows={5} defaultValue={v} className="input" /> : f.type === 'number' ? <input id={f.key} name={f.key} type="number" min={f.min} max={f.max} defaultValue={v} className="input max-w-[10rem]" /> : <input id={f.key} name={f.key} defaultValue={v} className="input" />}
                  {f.help && <p className="mt-1 text-xs text-ink-500">{f.help}</p>}</div>
              );
            })}
          </fieldset>
        ))}
        <p className="text-xs text-ink-500">Secrets and API keys are never stored here; they live in server environment variables.</p>
        <button className="btn-primary" type="submit">Save settings</button>
      </form>
    </div>
  );
}
