import * as React from 'react';
export function Navbar({ title, onToggleTheme, onOpenMenu, right }: { title: string; onToggleTheme?: () => void; onOpenMenu?: () => void; right?: React.ReactNode }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="flex items-center gap-3">
          <button className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-border" onClick={onOpenMenu} aria-label="Open menu"><span aria-hidden="true">≡</span></button>
          <div className="h-6 w-6 rounded-md bg-accent" aria-hidden="true" />
          <div className="font-semibold">{title}</div>
        </div>
        <div className="flex items-center gap-2">{right}<button className="text-sm hover:underline" onClick={onToggleTheme}>Toggle theme</button></div>
      </div>
    </header>
  );
}
