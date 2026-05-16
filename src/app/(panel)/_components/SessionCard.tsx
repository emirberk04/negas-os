"use client";

import { useEffect, useState } from "react";
import { Panel } from "./Panel";

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const TR_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function ist(): Date {
  // Yaklaşık IST — server/clients arasında saat farkını kompanse etmek için
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc + 3 * 3600_000);
}

function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const t = hour + minute / 60;
  if (day === 0) return false; // Pazar
  if (day === 6) return t >= 9 && t < 13; // Cumartesi yarım gün
  return t >= 9 && t < 18;
}

export function SessionCard() {
  const [time, setTime] = useState<{ h: string; m: string; s: string }>({
    h: "--",
    m: "--",
    s: "--",
  });
  const [dateStr, setDateStr] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = ist();
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      const s = String(d.getUTCSeconds()).padStart(2, "0");
      setTime({ h, m, s });
      setDateStr(
        `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${TR_DAYS[d.getUTCDay()]}`
      );
      setMarketOpen(isMarketOpen(d));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel number="02" title="OTURUM" meta="UTC+03 · IST">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="font-mono text-5xl font-bold tracking-tight text-[var(--text)] xl:text-6xl">
            NEGAŞ
          </h1>
          <div className="mt-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {dateStr}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-wider">
            <span
              className={`h-1.5 w-1.5 rounded-full ${marketOpen ? "bg-[var(--accent-up)]" : "bg-[var(--accent-down)]"}`}
            />
            <span
              className={
                marketOpen
                  ? "text-[var(--accent-up)]"
                  : "text-[var(--accent-down)]"
              }
            >
              {marketOpen ? "PİYASA AÇIK" : "PİYASA KAPALI"}
            </span>
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-4xl font-bold leading-none tracking-tight text-[var(--text)] xl:text-5xl">
            {time.h}
            <span className="text-[var(--accent-gold)]">:</span>
            {time.m}
            <span className="ml-2 align-top text-base text-[var(--text-muted)]">
              {time.s}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
