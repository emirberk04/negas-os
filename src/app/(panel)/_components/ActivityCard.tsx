"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Event = {
  ts: string;
  kind: "CRON" | "PRICE" | "INIT";
  msg: string;
};

type Props = {
  recent: Event[];
};

function fmtTs(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  });
}

const MAX = 20;

export function ActivityCard({ recent }: Props) {
  const [events, setEvents] = useState<Event[]>(recent);
  const [tickBuffer, setTickBuffer] = useState<{ count: number; lastTs: string | null }>({
    count: 0,
    lastTs: null,
  });

  useEffect(() => {
    const ch = supabase
      .channel("activity-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prices" },
        (payload) => {
          const r = payload.new as { created_at: string; symbol: string; ask: number };
          setTickBuffer((prev) => {
            // Bir cron tetiklemesi birden fazla insert üretir (~23 satır). Aynı saniyedekileri birleştir.
            const ts = r.created_at;
            if (prev.lastTs === ts) {
              return { count: prev.count + 1, lastTs: ts };
            }
            // Önceki cron tamamlandı, event olarak yaz
            if (prev.lastTs && prev.count > 0) {
              setEvents((evs) => {
                const next = [
                  {
                    ts: prev.lastTs!,
                    kind: "CRON" as const,
                    msg: `${prev.count} fiyat insert`,
                  },
                  ...evs,
                ].slice(0, MAX);
                return next;
              });
            }
            return { count: 1, lastTs: ts };
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <Panel number="10" title="SİSTEM AKTİVİTESİ" meta="CANLI">
      <div className="font-mono text-[11px]">
        <div className="grid grid-cols-[80px_60px_1fr] gap-2 border-b border-[var(--border-soft)] pb-1.5 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          <span>ZAMAN</span>
          <span>KAYNAK</span>
          <span>MESAJ</span>
        </div>
        <ul className="mt-1.5 space-y-1">
          {events.length === 0 && (
            <li className="text-[var(--text-muted)] opacity-70">
              Henüz aktivite kaydı yok — ilk cron beklenıyor.
            </li>
          )}
          {events.map((e, i) => (
            <li
              key={`${e.ts}-${i}`}
              className="grid grid-cols-[80px_60px_1fr] items-baseline gap-2"
            >
              <span className="text-[var(--text-muted)] tabular-nums">
                {fmtTs(e.ts)}
              </span>
              <span
                className={
                  e.kind === "CRON"
                    ? "text-[var(--accent-up)]"
                    : "text-[var(--accent-blue)]"
                }
              >
                {e.kind}
              </span>
              <span className="text-[var(--text)] opacity-80">{e.msg}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
