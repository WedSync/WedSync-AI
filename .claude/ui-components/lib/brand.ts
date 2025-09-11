export type Brand = 'wedex' | 'wedme';
export type Accent = 'default' | 'mint' | 'sky';
export function setBrand(brand: Brand, accent: Accent = 'default') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-brand', brand);
  if (brand === 'wedme') {
    if (accent === 'default') root.removeAttribute('data-accent');
    else root.setAttribute('data-accent', accent);
  } else root.removeAttribute('data-accent');
}
export function toggleDark(on?: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (on === undefined) root.classList.toggle('dark');
  else root.classList.toggle('dark', on);
}
