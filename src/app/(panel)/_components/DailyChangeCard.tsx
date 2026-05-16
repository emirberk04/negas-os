"use client";

import { Panel } from "./Panel";
import { fmt } from "@/lib/format";
import type { Tick } from "@/lib/history";

const ROWS: { symbol: string; label: string }[] = [
  { symbol: "GRAM_ALTIN", label: "GRAM" },
  { symbol: "ONS_USD", label: "ONS" },
  { symbol: "USD_TRY", label: "USD/TRY" },
  { symbol: "EUR_TRY", label: "EUR/TRY" },
];

type Props = {
  history: Record<string, Tick[]>;
  current: Record<string, { ask: number } | undefined>;
};

function changeFromOpen(ticks: Tick[] | undefined, currentAsk: number | undefined) {
  if (!ticks || ticks.length === 0 || currentAsk == null) return null;
  const open = ticks[0].ask;
  if (!open) return null;
  return ((currentAsk - open) / open) * 100;
}

export function DailyChangeCard({ history, current }: Props) {
  return (
    <Panel number="03" title="GÜN İÇİ DEĞİŞİM" meta="60 DK">
      <div className="space-y-2.5">
        {ROWS.map((r) => {
          const c = current[r.symbol];
          const pct = changeFromOpen(history[r.symbol], c?.ask);
          const isUp = pct != null && pct >= 0;
          const color =
            pct == null
              ? "text-[var(--text-muted)]"
              : isUp
                ? "text-[var(--accent-up)]"
                : "text-[var(--accent-down)]";
          return (
            <div
              key={r.symbol}
              className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2 text-[11px] uppercase tracking-wider last:border-b-0 last:pb-0"
            >
              <span className="text-[var(--text-muted)]">{r.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums text-[var(--text)]">
                  {c?.ask != null ? fmt(c.ask) : "—"}
                </span>
                <span className={`font-mono tabular-nums font-semibold ${color} min-w-[55px] text-right`}>
                  {pct == null ? "—" : `${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
