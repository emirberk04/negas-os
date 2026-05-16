"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";
import { fmt } from "@/lib/format";
import type { PriceRow } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const AYAR: { key: string; label: string; k: number }[] = [
  { key: "24", label: "24 Ayar (saf)", k: 1.0 },
  { key: "22", label: "22 Ayar", k: 0.916 },
  { key: "21", label: "21 Ayar", k: 0.875 },
  { key: "18", label: "18 Ayar", k: 0.75 },
  { key: "14", label: "14 Ayar", k: 0.585 },
  { key: "10", label: "10 Ayar", k: 0.417 },
  { key: "8", label: "8 Ayar", k: 0.333 },
];

type Props = {
  initialGramPrice: PriceRow | null;
};

export function AyarConverter({ initialGramPrice }: Props) {
  const [gramPrice, setGramPrice] = useState<PriceRow | null>(initialGramPrice);
  const [gram, setGram] = useState<string>("10");
  const [ayar, setAyar] = useState<string>("22");

  useEffect(() => {
    const ch = supabase
      .channel("converter-gram")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "prices",
          filter: "symbol=eq.GRAM_ALTIN",
        },
        (payload) => {
          setGramPrice(payload.new as PriceRow);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const gramNum = parseFloat(gram.replace(",", ".")) || 0;
  const sourceK = AYAR.find((a) => a.key === ayar)?.k ?? 1;
  const safGr = gramNum * sourceK;

  const bid = gramPrice?.bid ?? 0;
  const ask = gramPrice?.ask ?? 0;
  const tlBid = safGr * bid;
  const tlAsk = safGr * ask;

  // Diğer ayarlara karşılığı (saf gram → o ayardaki gram)
  const otherAyars = AYAR.filter((a) => a.key !== ayar).map((a) => ({
    ...a,
    gram: a.k > 0 ? safGr / a.k : 0,
  }));

  return (
    <Panel number="06" title="AYAR ÇEVİRİCİ" meta="HAMMADDE">
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              MİKTAR
            </label>
            <div className="mt-1 flex items-baseline gap-1 border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1">
              <input
                type="text"
                inputMode="decimal"
                value={gram}
                onChange={(e) => setGram(e.target.value.replace(/[^0-9.,]/g, ""))}
                className="w-full bg-transparent font-mono text-lg font-bold text-[var(--text)] tabular-nums outline-none"
              />
              <span className="text-[10px] text-[var(--text-muted)]">GR</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              AYAR
            </label>
            <select
              value={ayar}
              onChange={(e) => setAyar(e.target.value)}
              className="mt-1 block border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-sm text-[var(--text)] outline-none"
            >
              {AYAR.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.key}K
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-3 text-[11px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[var(--text-muted)]">SAF ALTIN (24K)</span>
            <span className="font-mono font-bold tabular-nums text-[var(--accent-gold)]">
              {fmt(safGr)} <span className="text-[10px] font-normal">GR</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[var(--text-muted)]">TL ALIŞ</span>
            <span className="font-mono tabular-nums text-[var(--text)]">
              {fmt(tlBid)} <span className="text-[10px] text-[var(--text-muted)]">TL</span>
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-[var(--text-muted)]">TL SATIŞ</span>
            <span className="font-mono font-bold tabular-nums text-[var(--text)]">
              {fmt(tlAsk)} <span className="text-[10px] text-[var(--text-muted)]">TL</span>
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-3">
          <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
            DİĞER AYARLARDA GRAM
          </div>
          <ul className="space-y-0.5 text-[11px]">
            {otherAyars.map((a) => (
              <li
                key={a.key}
                className="flex items-baseline justify-between font-mono"
              >
                <span className="text-[var(--text-muted)]">{a.key}K</span>
                <span className="tabular-nums text-[var(--text)]">
                  {fmt(a.gram)}{" "}
                  <span className="text-[10px] text-[var(--text-muted)]">GR</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-2 text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
          Referans: GRAM ALTIN {gramPrice ? fmt(gramPrice.ask) : "—"} TL
        </div>
      </div>
    </Panel>
  );
}
