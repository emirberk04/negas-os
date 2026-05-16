"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, fmtTime, ageSeconds } from "@/lib/format";
import type { PriceRow, SymbolMeta } from "@/lib/types";

type Props = {
  index: number;
  meta: SymbolMeta;
  row: PriceRow | null;
};

export function PriceCard({ index, meta, row }: Props) {
  const prevAskRef = useRef<number | null>(null);
  const prevStampRef = useRef<string | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | "tick" | null>(null);
  const [age, setAge] = useState<number>(0);

  useEffect(() => {
    if (!row) return;
    const prevAsk = prevAskRef.current;
    const prevStamp = prevStampRef.current;
    const isNewTick = prevStamp != null && prevStamp !== row.created_at;

    if (prevAsk != null && row.ask !== prevAsk) {
      setFlash(row.ask > prevAsk ? "up" : "down");
    } else if (isNewTick) {
      setFlash("tick");
    }

    prevAskRef.current = row.ask;
    prevStampRef.current = row.created_at;

    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [row]);

  useEffect(() => {
    if (!row) return;
    const tick = () => setAge(ageSeconds(row.created_at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [row]);

  const spread = row ? row.ask - row.bid : null;
  const spreadPct = row && row.bid > 0 ? ((row.ask - row.bid) / row.bid) * 100 : null;

  const flashBg =
    flash === "up"
      ? "bg-[#7FB069]/20"
      : flash === "down"
        ? "bg-[#D17B7B]/20"
        : flash === "tick"
          ? "bg-[#6B9FD4]/15"
          : "bg-[#141414]";

  const stale = age > 90;

  return (
    <div
      className={`border border-[#2A2A2A] p-6 transition-colors duration-500 ${flashBg}`}
    >
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider opacity-60">
        <span>
          {String(index).padStart(2, "0")} // {meta.label}
        </span>
        <span className="flex items-center gap-2">
          {flash === "up" && <span className="text-[#7FB069]">▲</span>}
          {flash === "down" && <span className="text-[#D17B7B]">▼</span>}
          {stale && <span className="text-[#D17B7B]">● STALE</span>}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6">
        <div>
          <div className="text-[10px] uppercase opacity-50">Alış</div>
          <div className="font-mono text-3xl font-bold">
            {fmt(row?.bid ?? null)}
            <span className="ml-1 text-base opacity-50">{meta.unit}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase opacity-50">Satış</div>
          <div className="font-mono text-3xl font-bold">
            {fmt(row?.ask ?? null)}
            <span className="ml-1 text-base opacity-50">{meta.unit}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#2A2A2A] pt-3 text-[11px] uppercase tracking-wider opacity-50">
        <span>
          Makas {fmt(spread)} {meta.unit}
          {spreadPct != null && ` · ${spreadPct.toFixed(2)}%`}
        </span>
        <span>{row ? `${fmtTime(row.created_at)} · ${age}s` : "—"}</span>
      </div>
    </div>
  );
}
