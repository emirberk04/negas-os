"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";
import { MiniBars } from "./MiniBars";
import { fmt } from "@/lib/format";
import { MAIN_SYMBOLS, type PriceRow } from "@/lib/types";
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

export function MainPricesCard({ initial, history }: Props) {
  const [rows, setRows] = useState<Record<string, PriceRow>>(initial);
  const [hist, setHist] = useState<Record<string, Tick[]>>(history);
  const flashRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const ch = supabase
      .channel("main-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prices" },
        (payload) => {
          const r = payload.new as PriceRow;
          if (!MAIN_SYMBOLS.find((s) => s.symbol === r.symbol)) return;

          setRows((prev) => {
            const cur = prev[r.symbol];
            if (cur && cur.ask !== r.ask) {
              const dir = r.ask > cur.ask ? "up" : "down";
              setFlash((f) => ({ ...f, [r.symbol]: dir }));
              clearTimeout(flashRef.current[r.symbol]);
              flashRef.current[r.symbol] = setTimeout(() => {
                setFlash((f) => {
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
    <Panel number="03" title="ANA FİYATLAR" meta={`${MAIN_SYMBOLS.length} VARLIK · 60 DK`}>
      <div className="space-y-3">
        {MAIN_SYMBOLS.map((meta) => {
          const r = rows[meta.symbol];
          const trend = hist[meta.symbol] || [];
          const open = trend[0]?.ask;
          const pct = r && open ? ((r.ask - open) / open) * 100 : null;
          const isUp = pct != null && pct >= 0;
          const f = flash[meta.symbol];

          const bg =
            f === "up"
              ? "bg-[var(--accent-up)]/10"
              : f === "down"
                ? "bg-[var(--accent-down)]/10"
                : "";

          return (
            <div
              key={meta.symbol}
              className={`flex items-center gap-4 border-b border-[var(--border-soft)] pb-3 transition-colors duration-500 last:border-b-0 last:pb-0 ${bg}`}
            >
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
                  {meta.label}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                  {meta.symbol}
                </div>
              </div>

              <div className="flex-1 text-[var(--text-muted)]">
                <MiniBars data={trend} width={72} height={22} bars={9} />
              </div>

              <div className="text-right">
                <div className="font-mono text-lg font-bold tabular-nums text-[var(--text)] leading-none">
                  {r ? fmt(r.ask) : "—"}
                  <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">
                    {meta.unit}
                  </span>
                </div>
                <div
                  className={`mt-1 text-[10px] font-mono tabular-nums ${
                    pct == null
                      ? "text-[var(--text-muted)]"
                      : isUp
                        ? "text-[var(--accent-up)]"
                        : "text-[var(--accent-down)]"
                  }`}
                >
                  {pct == null ? "—" : `${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`}
                </div>
              </div>

              <div className="w-10 shrink-0 text-right">
                <span
                  className={`inline-block h-5 w-5 ${
                    pct == null
                      ? "bg-[var(--border)]"
                      : isUp
                        ? "bg-[var(--accent-up)]"
                        : "bg-[var(--accent-down)]"
                  }`}
                  title={pct != null ? `${pct.toFixed(2)}%` : ""}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
