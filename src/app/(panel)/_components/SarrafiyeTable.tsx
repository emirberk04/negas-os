"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

const HIST_KEEP = 90; // tutulacak max nokta (~90 dk)

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
              }, 600);
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
    <section>
      <div className="mb-3 flex items-baseline justify-between text-xs uppercase tracking-wider opacity-60">
        <span>05 // SARRAFİYE</span>
        <span>{SARRAFIYE_SYMBOLS.length} ÜRÜN · SON 60 DK</span>
      </div>
      <div className="border border-[#2A2A2A]">
        <table className="w-full font-mono text-sm">
          <thead className="text-[10px] uppercase tracking-wider opacity-50">
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-4 py-2 text-left">Ürün</th>
              <th className="px-4 py-2 text-right">Alış</th>
              <th className="px-4 py-2 text-right">Satış</th>
              <th className="px-4 py-2 text-right">Makas</th>
              <th className="px-4 py-2 text-right">%</th>
              <th className="px-4 py-2 text-right">Trend</th>
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
              const rowBg =
                flash === "up"
                  ? "bg-[#7FB069]/15"
                  : flash === "down"
                    ? "bg-[#D17B7B]/15"
                    : "";

              return (
                <tr
                  key={meta.symbol}
                  className={`border-b border-[#1F1F1F] transition-colors duration-500 ${rowBg}`}
                >
                  <td className="px-4 py-2 text-[12px] tracking-wider opacity-80">
                    {meta.label}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(r?.bid ?? null)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-bold">
                    {fmt(r?.ask ?? null)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums opacity-60">
                    {fmt(spread)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums opacity-60">
                    {spreadPct != null ? `${spreadPct.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-block">
                      <Sparkline data={trend} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
