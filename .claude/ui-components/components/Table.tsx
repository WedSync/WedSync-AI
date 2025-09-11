import * as React from 'react';
export interface Column<T> { key: keyof T; header: string; render?: (row: T) => React.ReactNode; width?: string; }
export function Table<T extends { id: string }>({ columns, rows, density='default' }: { columns: Column<T>[]; rows: T[]; density?: 'default' | 'compact' }) {
  const rowClass = density === 'compact' ? 'h-10' : 'h-12';
  return (
    <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>{columns.map(c => <th key={String(c.key)} className="px-3 py-3 text-left text-sm font-semibold text-foreground" style={{ width: c.width }}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {rows.map(row => <tr key={row.id} className={rowClass}>{columns.map(c => <td key={String(c.key)} className="whitespace-nowrap px-3 text-sm">{c.render?c.render(row):String(row[c.key])}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
