"use client";

import { useEffect, useState } from "react";

function fmtDate(d: Date): string {
  return d
    .toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/Istanbul",
    })
    .replace(/\./g, "");
}

export function TopBar() {
  const [now, setNow] = useState<string>("--:--:--");
  const [date, setDate] = useState<string>("--------");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Europe/Istanbul",
        })
      );
      setDate(fmtDate(d));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-6 py-2 text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
      <div className="flex items-center gap-3">
        <span className="text-[var(--accent-gold)]">✦</span>
        <span className="font-semibold text-[var(--text)]">
          NEGAŞ OS // V0.1
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span>IST {date}</span>
        <span>{now}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-live)]" />
          LIVE
        </span>
      </div>
    </header>
  );
}
