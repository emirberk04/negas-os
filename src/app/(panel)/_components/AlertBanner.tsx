"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type AlertEvent = {
  id: number;
  symbol: string;
  condition: "above" | "below";
  threshold: number;
  value: number;
  message: string | null;
  triggered_at: string;
};

const BANNER_DURATION_MS = 12_000;

export function AlertBanner() {
  const [active, setActive] = useState<AlertEvent | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("alert-events-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_events" },
        (payload) => {
          const r = payload.new as AlertEvent;
          setActive(r);
          // 12 sn sonra otomatik kapan
          setTimeout(() => {
            setActive((cur) => (cur?.id === r.id ? null : cur));
          }, BANNER_DURATION_MS);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (!active) return null;

  const isUp = active.condition === "above";
  const bgClass = isUp
    ? "bg-[var(--accent-up)] text-[#0F1A0B]"
    : "bg-[var(--accent-down)] text-[#1F0A0A]";
  const arrow = isUp ? "▲" : "▼";

  return (
    <div
      className={`flex items-center justify-between border-b-2 border-[var(--text)] px-6 py-3 ${bgClass} animate-pulse-once font-mono`}
    >
      <div className="flex items-center gap-4">
        <span className="text-xl">⚠</span>
        <span className="text-xs font-bold uppercase tracking-[0.2em]">
          ALARM
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider">
          {active.message ||
            `${active.symbol} ${arrow} ${Number(active.threshold).toLocaleString("tr-TR")} EŞİĞİ KIRILDI`}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-wider">ŞU AN</span>
        <span className="font-mono text-lg font-bold tabular-nums">
          {Number(active.value).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <button
          onClick={() => setActive(null)}
          className="border border-current px-2 py-0.5 text-[10px] uppercase tracking-wider opacity-80 hover:opacity-100"
        >
          KAPAT
        </button>
      </div>
    </div>
  );
}
