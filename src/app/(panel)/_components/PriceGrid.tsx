"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { PriceCard } from "./PriceCard";
import { MAIN_SYMBOLS, type PriceRow } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Props = { initial: Record<string, PriceRow> };

export function PriceGrid({ initial }: Props) {
  const [rows, setRows] = useState<Record<string, PriceRow>>(initial);

  useEffect(() => {
    const ch = supabase
      .channel("prices-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prices" },
        (payload) => {
          const r = payload.new as PriceRow;
          setRows((prev) => {
            const cur = prev[r.symbol];
            if (cur && new Date(cur.created_at) >= new Date(r.created_at)) {
              return prev;
            }
            return { ...prev, [r.symbol]: r };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {MAIN_SYMBOLS.map((meta, i) => (
        <PriceCard
          key={meta.symbol}
          index={i + 1}
          meta={meta}
          row={rows[meta.symbol] ?? null}
        />
      ))}
    </div>
  );
}
