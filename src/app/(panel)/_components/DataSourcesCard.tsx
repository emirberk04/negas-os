import { Panel } from "./Panel";

type Source = {
  code: string;
  name: string;
  count: number;
  status: "live" | "idle" | "down";
};

type Props = {
  sources: Source[];
};

export function DataSourcesCard({ sources }: Props) {
  const total = sources.reduce((a, s) => a + s.count, 0);
  return (
    <Panel number="04" title="VERİ KAYNAKLARI" meta={`${total} SEMBOL`}>
      <ul className="space-y-2 text-[11px]">
        {sources.map((s) => {
          const dot =
            s.status === "live"
              ? "bg-[var(--accent-up)]"
              : s.status === "idle"
                ? "bg-[var(--accent-warn)]"
                : "bg-[var(--accent-down)]";
          return (
            <li key={s.code} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-12 shrink-0">
                  {s.code}
                </span>
                <span className="truncate text-[var(--text)]">{s.name}</span>
              </span>
              <span className="font-mono tabular-nums text-[var(--text-muted)]">
                {s.count}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
