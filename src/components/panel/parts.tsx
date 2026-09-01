import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  accent?: boolean | undefined;
}) {
  return (
    <div className="panel-card p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel-card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StartsChart({ serie }: { serie: { dia: string; total: number; novos: number }[] }) {
  const data = serie.slice(-14);
  const max = Math.max(1, ...data.map((item) => item.total));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum /start registrado ainda.</p>;
  }

  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((item) => (
        <div key={item.dia} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-primary transition-all"
              style={{ height: `${Math.max(4, (item.total / max) * 100)}%` }}
              title={`${item.dia}: ${item.total} starts (${item.novos} novos)`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{item.dia.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function Table({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            {columns.map((column) => (
              <th key={column} className="pb-2 pr-4 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2.5 pr-4 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
