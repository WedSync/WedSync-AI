export function formatDate(d: Date, locale='en-GB', opts: Intl.DateTimeFormatOptions = { day:'2-digit', month:'short', year:'numeric' }) {
  return new Intl.DateTimeFormat(locale, opts).format(d);
}
export function fromUTCToLocal(d: Date, tz='Europe/London') {
  const s = d.toLocaleString('en-GB', { timeZone: tz });
  return new Date(s);
}
export function relativeTime(date: Date, now = new Date()) {
  const diff = (date.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  const table: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.34524, 'week'], [12, 'month'], [Infinity, 'year']
  ];
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let value = diff, acc = 1;
  for (const [step, u] of table) { if (abs < acc*step) { unit = u; value = diff/acc; break; } acc *= step; }
  return rtf.format(Math.round(value), unit);
}
export function formatGBP(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);
}
export const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
