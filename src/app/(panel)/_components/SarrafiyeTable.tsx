"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";
import { Sparkline } from "./Sparkline";
import { fmt } from "@/lib/format";
import { SARRAFIYE_SYMBOLS, type PriceRow } from "@/lib/types";
import type { Tick } from "@/lib/history";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Props = {
  initial: Record<string, PriceRow>;
  history: Record<string, Tick[]>;
};

const HIST_KEEP = 90;

export function SarrafiyeTable({ initial, history }: Props) {
  const [rows, setRows] = useState<Record<string, PriceRow>>(initial);
  const [hist, setHist] = useState<Record<string, Tick[]>>(history);
  const flashRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [flashing, setFlashing] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const ch = supabase
      .channel("sarrafiye-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prices" },
        (payload) => {
          const r = payload.new as PriceRow;
          if (!SARRAFIYE_SYMBOLS.find((s) => s.symbol === r.symbol)) return;

          setRows((prev) => {
            const cur = prev[r.symbol];
            if (cur && cur.ask !== r.ask) {
              const dir = r.ask > cur.ask ? "up" : "down";
              setFlashing((f) => ({ ...f, [r.symbol]: dir }));
              clearTimeout(flashRef.current[r.symbol]);
              flashRef.current[r.symbol] = setTimeout(() => {
                setFlashing((f) => {
                  const c = { ...f };
                  delete c[r.symbol];
                  return c;
                });
              }, 700);
            }
            return { ...prev, [r.symbol]: r };
          });

          setHist((prev) => {
            const arr = [...(prev[r.symbol] || [])];
            arr.push({ ts: new Date(r.created_at).getTime(), ask: Number(r.ask) });
            if (arr.length > HIST_KEEP) arr.shift();
            return { ...prev, [r.symbol]: arr };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <Panel
      number="07"
      title="SARRAFİYE"
      meta={`${SARRAFIYE_SYMBOLS.length} ÜRÜN · CANLI`}
    >
      <table className="w-full font-mono text-[12px]">
        <thead className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          <tr className="border-b border-[var(--border-soft)]">
            <th className="px-2 py-1.5 text-left">Ürün</th>
            <th className="px-2 py-1.5 text-right">Alış</th>
            <th className="px-2 py-1.5 text-right">Satış</th>
            <th className="px-2 py-1.5 text-right">Makas</th>
            <th className="px-2 py-1.5 text-right">%</th>
            <th className="px-2 py-1.5 text-right">Trend 60 dk</th>
          </tr>
        </thead>
        <tbody>
          {SARRAFIYE_SYMBOLS.map((meta) => {
            const r = rows[meta.symbol];
            const trend = hist[meta.symbol] || [];
            const spread = r ? r.ask - r.bid : null;
            const spreadPct =
              r && r.bid > 0 ? ((r.ask - r.bid) / r.bid) * 100 : null;
            const flash = flashing[meta.symbol];
            const open = trend[0]?.ask;
            const pct = r && open ? ((r.ask - open) / open) * 100 : null;
            const isUp = pct != null && pct >= 0;
            const rowBg =
              flash === "up"
                ? "bg-[var(--accent-up)]/10"
                : flash === "down"
                  ? "bg-[var(--accent-down)]/10"
                  : "";

            return (
              <tr
                key={meta.symbol}
                className={`border-b border-[var(--border-soft)] transition-colors duration-500 last:border-b-0 ${rowBg}`}
              >
                <td className="px-2 py-1.5">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text)]">
                    {meta.label}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-muted)]">
                  {fmt(r?.bid ?? null)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums font-bold text-[var(--text)]">
                  {fmt(r?.ask ?? null)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-muted)]">
                  {fmt(spread)}
                </td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums ${
                    pct == null
                      ? "text-[var(--text-muted)]"
                      : isUp
                        ? "text-[var(--accent-up)]"
                        : "text-[var(--accent-down)]"
                  }`}
                >
                  {pct == null
                    ? spreadPct != null
                      ? `${spreadPct.toFixed(2)}`
                      : "—"
                    : `${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}`}
                </td>
                <td className="px-2 py-1.5 text-right text-[var(--text-muted)]">
                  <span className="inline-block">
                    <Sparkline data={trend} width={90} height={18} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
