import * as React from 'react';
export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: string; type: ToastType; message: string; }
const Ctx = React.createContext<{ toasts: Toast[]; push: (t: Omit<Toast,'id'>) => void; remove: (id: string) => void; } | null>(null);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const remove = (id: string) => setToasts(x => x.filter(t => t.id !== id));
  const push = (t: Omit<Toast,'id'>) => { const id = Math.random().toString(36).slice(2); setToasts(x => [...x, { id, ...t }]); setTimeout(() => remove(id), 4000); };
  return <Ctx.Provider value={{ toasts, push, remove }}>{children}
    <div className="fixed bottom-4 right-4 space-y-2">
      {toasts.map(t => (
        <div key={t.id} role="status" aria-live="polite"
             className={'rounded-md border px-4 py-3 text-sm shadow-sm ' +
              (t.type==='success'?'border-green-300 bg-green-50 text-green-900'
              :t.type==='error'?'border-red-300 bg-red-50 text-red-900'
              :'border-border bg-elevated text-foreground')}>
          {t.message}
        </div>
      ))}
    </div></Ctx.Provider>;
}
export function useToast(){const c=React.useContext(Ctx); if(!c) throw new Error('useToast must be used within ToastProvider'); return c;}
