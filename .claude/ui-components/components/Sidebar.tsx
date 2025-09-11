import * as React from 'react';
import clsx from 'clsx';
export interface Item { label: string; href?: string; active?: boolean; }
function useFocusTrap(enabled: boolean) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!enabled) return;
    const el = ref.current; if (!el) return;
    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(x => !x.hasAttribute('disabled') && !x.getAttribute('aria-hidden'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusable(); if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
  return ref;
}
export function Sidebar({ items, className, open, onClose }: { items: Item[]; className?: string; open?: boolean; onClose?: () => void; }) {
  const trapRef = useFocusTrap(!!open);
  return (<>
    <aside className={clsx('app-sidebar w-64 p-4', className)} aria-label="Sidebar navigation">
      <nav className="space-y-1 text-sm">
        {items.map(it => (<a key={it.label} href={it.href || '#'} className={clsx('block rounded-md px-3 py-2 hover:bg-muted', it.active && 'bg-muted font-medium border border-border')}>{it.label}</a>))}
      </nav>
    </aside>
    {open && (<div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'var(--scrim)' }} onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className="absolute left-0 top-0 h-full w-[280px] bg-elevated border-r border-border p-4 shadow-md">
        <div className="mb-2 flex items-center justify-between"><div className="font-semibold text-sm">Menu</div><button className="text-sm underline" onClick={onClose} aria-label="Close menu">Close</button></div>
        <nav className="space-y-1 text-sm">{items.map(it => (<a key={it.label} href={it.href || '#'} className={clsx('block rounded-md px-3 py-2 hover:bg-muted', it.active && 'bg-muted font-medium border border-border')}>{it.label}</a>))}</nav>
      </div>
    </div>)}
  </>);
}
