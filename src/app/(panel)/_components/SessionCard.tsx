"use client";

import { useEffect, useState } from "react";
import { Panel } from "./Panel";
import type { Weather } from "@/lib/sources/openmeteo";
import type { PrayerSet } from "@/lib/sources/prayer";
import { computeNextPrayer } from "@/lib/sources/prayer";
import type { BayramCountdown } from "@/lib/bayram";

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const TR_DAYS = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi",
];

function ist(): Date {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc + 3 * 3600_000);
}

function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const t = hour + minute / 60;
  if (day === 0) return false;
  if (day === 6) return t >= 9 && t < 13;
  return t >= 9 && t < 18;
}

function fmtBayramDate(iso: string): string {
  const d = new Date(iso + "T00:00:00+03:00");
  return `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

type Props = {
  weather: Weather | null;
  prayerSet: PrayerSet | null;
  bayram: BayramCountdown;
};

export function SessionCard({ weather, prayerSet, bayram }: Props) {
  const [time, setTime] = useState({ h: "--", m: "--", s: "--" });
  const [dateStr, setDateStr] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<ReturnType<
    typeof computeNextPrayer
  > | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = ist();
      setTime({
        h: String(d.getUTCHours()).padStart(2, "0"),
        m: String(d.getUTCMinutes()).padStart(2, "0"),
        s: String(d.getUTCSeconds()).padStart(2, "0"),
      });
      setDateStr(
        `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${TR_DAYS[d.getUTCDay()]}`
      );
      setMarketOpen(isMarketOpen(d));
      if (prayerSet) setNextPrayer(computeNextPrayer(prayerSet));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerSet]);

  return (
    <Panel number="02" title="OTURUM" meta="UTC+03 · IST">
      <div className="flex items-stretch gap-6">
        {/* SOL: NEGAŞ markası */}
        <div className="flex-shrink-0">
          <h1 className="font-mono text-5xl font-bold tracking-tight text-[var(--text)] xl:text-6xl">
            NEGAŞ
          </h1>
          <div className="mt-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {dateStr}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider">
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

        {/* ORTA: 3 mini blok yan yana */}
        <div className="flex flex-1 items-stretch justify-center gap-4 border-x border-[var(--border-soft)] px-6">
          {/* HAVA */}
          <MiniBlock label="HAVA · KONYA">
            {weather ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text)] leading-none">
                  {weather.temp}°
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {weather.label}
                </div>
                <div className="mt-2 text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                  Yarın {weather.tomorrowMin}°/{weather.tomorrowMax}°
                </div>
              </>
            ) : (
              <span className="text-[10px] text-[var(--text-faint)]">—</span>
            )}
          </MiniBlock>

          {/* NAMAZ */}
          <MiniBlock label="YAKLAŞAN VAKİT">
            {nextPrayer ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text)] leading-none">
                  {nextPrayer.time}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {nextPrayer.name}
                </div>
                <div className="mt-2 text-[9px] uppercase tracking-wider text-[var(--accent-gold)]">
                  {nextPrayer.minutesLeft > 0
                    ? nextPrayer.minutesLeft >= 60
                      ? `${Math.floor(nextPrayer.minutesLeft / 60)}sa ${nextPrayer.minutesLeft % 60}dk`
                      : `${nextPrayer.minutesLeft} dk sonra`
                    : "Yarın"}
                </div>
              </>
            ) : (
              <span className="text-[10px] text-[var(--text-faint)]">—</span>
            )}
          </MiniBlock>

          {/* BAYRAM */}
          <MiniBlock label="BAYRAM">
            <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text)] leading-none">
              {bayram.next.daysLeft}
              <span className="ml-1 text-base font-normal text-[var(--text-muted)]">
                gün
              </span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--accent-gold)]">
              {bayram.next.type}
            </div>
            <div className="mt-2 text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
              {fmtBayramDate(bayram.next.date)}
            </div>
          </MiniBlock>
        </div>

        {/* SAĞ: Saat */}
        <div className="flex-shrink-0 text-right font-mono">
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

function MiniBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[110px] flex-col justify-between border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] opacity-80">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
