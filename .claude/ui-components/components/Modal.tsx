import * as React from 'react';
import clsx from 'clsx';
export interface ModalProps { open: boolean; onClose: () => void; title?: string; children?: React.ReactNode; widthClass?: string; }
export function Modal({ open, onClose, title, children, widthClass='max-w-lg' }: ModalProps) {
  React.useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key==='Escape') onClose(); }; if (open) document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'var(--scrim)' }} onClick={onClose} />
      <div className={clsx('relative w-full rounded-lg border border-border bg-background shadow-md', widthClass)}>
        {title && <div className="border-b border-border p-4 text-sm font-semibold">{title}</div>}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
