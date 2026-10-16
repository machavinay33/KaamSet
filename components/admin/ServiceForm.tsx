import { saveServiceAction } from '@/app/admin/actions';
import { serviceImageUrl } from '@/lib/data/public';
import { WEEKDAYS } from '@/lib/format';

type Props = { service?: any; categories: any[] };

export function ServiceForm({ service: s, categories }: Props) {
  const days: number[] = s?.allowed_weekdays ?? [0, 1, 2, 3, 4, 5, 6];
  const k = s?.id ?? 'new';
  const imageUrl = serviceImageUrl(s?.image_path);
  return (
    <form action={saveServiceAction} encType="multipart/form-data" className="space-y-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor={`n-${k}`}>Name</label><input id={`n-${k}`} name="name" required minLength={2} maxLength={80} defaultValue={s?.name} className="input" /></div>
        <div><label className="label" htmlFor={`sl-${k}`}>Slug (web address)</label><input id={`sl-${k}`} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={s?.slug} placeholder="auto from name" className="input" /></div>
        <div><label className="label" htmlFor={`c-${k}`}>Category</label><select id={`c-${k}`} name="category_id" defaultValue={s?.category_id ?? ''} className="input"><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor={`p-${k}`}>Price (INR)</label><input id={`p-${k}`} name="price_inr" type="number" step="0.01" min="0" required defaultValue={s ? Number(s.price_inr) : undefined} className="input" /></div>
        <div><label className="label" htmlFor={`pn-${k}`}>Price note</label><input id={`pn-${k}`} name="price_note" maxLength={40} defaultValue={s?.price_note ?? ''} placeholder="e.g. per visit" className="input" /></div>
        <div><label className="label" htmlFor={`d-${k}`}>Estimated duration (minutes)</label><input id={`d-${k}`} name="duration_minutes" type="number" min="5" max="1440" defaultValue={s?.duration_minutes ?? ''} className="input" /></div>
        <div><label className="label" htmlFor={`l-${k}`}>Lead time override (hours)</label><input id={`l-${k}`} name="min_lead_hours" type="number" min="0" defaultValue={s?.min_lead_hours ?? ''} placeholder="global default" className="input" /></div>
        <div><label className="label" htmlFor={`a-${k}`}>Advance booking override (days)</label><input id={`a-${k}`} name="max_advance_days" type="number" min="1" max="365" defaultValue={s?.max_advance_days ?? ''} placeholder="global default" className="input" /></div>
      </div>
      <div className="space-y-2">
        <label className="label" htmlFor={`image-${k}`}>Service image</label>
        {imageUrl ? <div role="img" aria-label={`Current image for ${s.name}`} className="aspect-[4/3] max-w-sm rounded-xl bg-cover bg-center" style={{ backgroundImage: `url("${imageUrl}")` }} /> : <p className="text-sm text-ink-500">No image uploaded yet.</p>}
        <input id={`image-${k}`} name="service_image" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
        <p className="text-xs text-ink-500">JPEG, PNG or WebP, up to 3 MB. Uploading a new image replaces the current one.</p>
      </div>
      <div><label className="label" htmlFor={`ds-${k}`}>Description</label><textarea id={`ds-${k}`} name="description" rows={3} maxLength={600} defaultValue={s?.description} className="input" /></div>
      <div><label className="label" htmlFor={`um-${k}`}>Message shown when temporarily unavailable</label><input id={`um-${k}`} name="unavailable_message" maxLength={200} defaultValue={s?.unavailable_message ?? ''} className="input" /></div>
      <fieldset><legend className="label">Days this service can be booked</legend><div className="flex flex-wrap gap-3">{WEEKDAYS.map((d, i) => <label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" name="weekdays" value={i} defaultChecked={days.includes(i)} className="h-4 w-4 accent-orange-600" />{d}</label>)}</div></fieldset>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={s ? s.is_active : true} className="h-4 w-4 accent-orange-600" /> Visible on the website</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_bookable" defaultChecked={s ? s.is_bookable : true} className="h-4 w-4 accent-orange-600" /> Open for booking</label>
      </div>
      <p className="text-xs text-ink-500">Price changes apply to new bookings only; existing bookings keep their original price and name.</p>
      <button className="btn-primary btn-sm" type="submit">{s ? 'Save service' : 'Create service'}</button>
    </form>
  );
}
