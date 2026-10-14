'use client';
import { useRef } from 'react';

/** Button that opens a confirmation dialog; the server action runs only when the admin confirms inside the dialog. */
export function ConfirmForm({ action, label, title, description, confirmLabel, variant = 'primary', small = true, children }: {
  action: (fd: FormData) => void | Promise<void>; label: string; title: string; description?: string; confirmLabel: string;
  variant?: 'primary' | 'secondary' | 'danger'; small?: boolean; children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cls = `btn-${variant}${small ? ' btn-sm' : ''}`;
  return (
    <>
      <button type="button" className={cls} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} aria-labelledby="confirm-title" className="w-[min(92vw,28rem)] rounded-2xl border border-line bg-white p-0 shadow-xl backdrop:bg-ink-900/40">
        <form action={action} className="space-y-4 p-6">
          <h3 id="confirm-title" className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-ink-600">{description}</p>}
          {children}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.close()}>Go back</button>
            <button type="submit" className={`btn-${variant} btn-sm`}>{confirmLabel}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
