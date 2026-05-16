"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/format";
import type { PriceRow, SymbolMeta } from "@/lib/types";

type Props = {
  index: number;
  meta: SymbolMeta;
  row: PriceRow | null;
};

export function PriceCard({ index, meta, row }: Props) {
  const prevAskRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!row) return;
    const prev = prevAskRef.current;
    if (prev != null && row.ask !== prev) {
      setFlash(row.ask > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
    prevAskRef.current = row.ask;
  }, [row]);

  useEffect(() => {
    if (row) prevAskRef.current = row.ask;
  }, [row]);

  const spread = row ? row.ask - row.bid : null;
  const spreadPct = row && row.bid > 0 ? ((row.ask - row.bid) / row.bid) * 100 : null;

  const flashBg =
    flash === "up"
      ? "bg-[#7FB069]/15"
      : flash === "down"
        ? "bg-[#D17B7B]/15"
        : "bg-[#141414]";

  return (
    <div
      className={`border border-[#2A2A2A] p-6 transition-colors duration-500 ${flashBg}`}
    >
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider opacity-60">
        <span>
          {String(index).padStart(2, "0")} // {meta.label}
        </span>
        {flash && (
          <span
            className={
              flash === "up" ? "text-[#7FB069]" : "text-[#D17B7B]"
            }
          >
            {flash === "up" ? "▲" : "▼"}
          </span>
        )}
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
        <span>{row?.source ?? "—"}</span>
      </div>
    </div>
  );
}
