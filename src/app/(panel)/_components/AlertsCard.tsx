"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";
import { MAIN_SYMBOLS, SARRAFIYE_SYMBOLS } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Alert = {
  id: number;
  symbol: string;
  condition: "above" | "below";
  threshold: number;
  label: string | null;
  enabled: boolean;
};

type Props = {
  number?: string;
  initial: Alert[];
};

const ALL_SYMBOLS = [...MAIN_SYMBOLS, ...SARRAFIYE_SYMBOLS];

function fmtN(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AlertsCard({ number = "06", initial }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initial);
  const [adding, setAdding] = useState(false);
  const [symbol, setSymbol] = useState("GRAM_ALTIN");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel("alerts-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        async () => {
          const { data } = await supabase
            .from("alerts")
            .select("id, symbol, condition, threshold, label, enabled")
            .order("symbol", { ascending: true });
          setAlerts((data || []) as Alert[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function addAlert() {
    const t = parseFloat(threshold.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(t) || t <= 0) return;
    setBusy(true);
    const { error } = await supabase.from("alerts").insert({
      symbol,
      condition,
      threshold: t,
      enabled: true,
    });
    setBusy(false);
    if (!error) {
      setThreshold("");
      setAdding(false);
    }
  }

  async function deleteAlert(id: number) {
    await supabase.from("alerts").delete().eq("id", id);
  }

  async function toggle(id: number, current: boolean) {
    await supabase.from("alerts").update({ enabled: !current }).eq("id", id);
  }

  return (
    <Panel
      number={number}
      title="ALARM"
      meta={`${alerts.filter((a) => a.enabled).length} AKTİF`}
    >
      <div className="space-y-2 text-[11px]">
        {alerts.length === 0 && !adding && (
          <div className="text-[var(--text-muted)] opacity-70">
            Henüz alarm yok. Aşağıdan ekle.
          </div>
        )}

        {alerts.map((a) => {
          const sym = ALL_SYMBOLS.find((s) => s.symbol === a.symbol);
          const arrow = a.condition === "above" ? "↑" : "↓";
          const color =
            a.condition === "above"
              ? "text-[var(--accent-up)]"
              : "text-[var(--accent-down)]";
          return (
            <div
              key={a.id}
              className={`grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--border-soft)] pb-1.5 last:border-b-0 ${
                a.enabled ? "" : "opacity-40"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {sym?.label || a.symbol}
                  </span>
                  <span className={`ml-2 font-mono font-bold ${color}`}>
                    {arrow} {fmtN(Number(a.threshold))}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggle(a.id, a.enabled)}
                  className="border border-[var(--border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  title={a.enabled ? "Devre dışı bırak" : "Aktifleştir"}
                >
                  {a.enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => deleteAlert(a.id)}
                  className="border border-[var(--border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--accent-down)] hover:bg-[var(--bg-elevated)]"
                  title="Sil"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        {adding ? (
          <div className="space-y-2 border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="border border-[var(--border)] bg-[var(--bg-panel)] px-1.5 py-1 font-mono text-[11px] outline-none"
              >
                {ALL_SYMBOLS.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as "above" | "below")
                }
                className="border border-[var(--border)] bg-[var(--bg-panel)] px-1.5 py-1 font-mono text-[11px] outline-none"
              >
                <option value="above">↑ ÜSTÜNE</option>
                <option value="below">↓ ALTINA</option>
              </select>
            </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Eşik (örn: 6800 veya 4550.50)"
              value={threshold}
              onChange={(e) =>
                setThreshold(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              className="w-full border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-sm tabular-nums outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={addAlert}
                disabled={busy || !threshold}
                className="flex-1 border border-[var(--accent-up)] bg-[var(--accent-up)]/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--accent-up)] hover:bg-[var(--accent-up)]/20 disabled:opacity-40"
              >
                {busy ? "..." : "EKLE"}
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setThreshold("");
                }}
                className="border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
              >
                İPTAL
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full border border-dashed border-[var(--border)] py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
          >
            + YENİ ALARM
          </button>
        )}
      </div>
    </Panel>
  );
}
