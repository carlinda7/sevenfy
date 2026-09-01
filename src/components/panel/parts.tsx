import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  accent?: boolean | undefined;
  icon?: ReactNode | undefined;
  tone?: "primary" | "accent" | "warning" | "neutral" | undefined;
}) {
  const toneRing =
    tone === "accent"
      ? "bg-accent/15 text-accent"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : tone === "neutral"
          ? "bg-secondary text-muted-foreground"
          : "bg-primary/18 text-primary";

  return (
    <div className="panel-card group relative overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-xl text-sm ${toneRing}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={`mt-3 font-display text-[1.6rem] font-bold leading-none tabular-nums sm:text-3xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</p> : null}
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
    <section className="panel-card h-full p-4 sm:p-5">
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <h2 className="min-w-0 truncate font-display text-base font-semibold sm:text-lg">
          {title}
        </h2>
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
    <div className="flex h-36 items-end gap-1 sm:h-48 sm:gap-2">
      {data.map((item) => (
        <div key={item.dia} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="relative w-full rounded-t-lg bg-linear-to-t from-primary/25 via-primary/70 to-primary transition-all duration-300 group-hover:from-accent/30 group-hover:to-accent"
              style={{ height: `${Math.max(4, (item.total / max) * 100)}%` }}
              title={`${item.dia}: ${item.total} starts (${item.novos} novos)`}
            >
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-popover px-1.5 py-0.5 text-[10px] font-semibold text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.total}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground sm:text-[10px]">
            {item.dia.slice(8)}
          </span>
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
    <>
      {/* Mobile: cada linha vira um cartão legível */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((row, index) => (
          <li key={index} className="rounded-xl border border-border/60 bg-secondary/35 p-3">
            <dl className="space-y-1.5">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    {columns[cellIndex]}
                  </dt>
                  <dd className="min-w-0 truncate text-right text-sm font-medium">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              {columns.map((column) => (
                <th key={column} className="pb-2 pr-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border/50 transition-colors hover:bg-secondary/30">
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
    </>
  );
}
