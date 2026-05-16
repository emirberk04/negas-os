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

const TZ = "Europe/Istanbul";

function getISTparts() {
  const d = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, ...opts }).format(d);
  return {
    h: fmt({ hour: "2-digit", hour12: false }),
    m: fmt({ minute: "2-digit" }),
    s: fmt({ second: "2-digit" }),
    day: parseInt(fmt({ weekday: "narrow" }) /* just need day-of-week index */),
    hour24: parseInt(fmt({ hour: "2-digit", hour12: false })),
    minute: parseInt(fmt({ minute: "2-digit" })),
    dayOfWeek: new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
    }).format(d), // "Mon", "Sat", "Sun"
    dayNum: parseInt(new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "numeric" }).format(d)),
    month: parseInt(new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "numeric" }).format(d)) - 1,
    year: parseInt(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(d)),
  };
}

function isMarketOpen(): boolean {
  const { dayOfWeek, hour24, minute } = getISTparts();
  const t = hour24 + minute / 60;
  if (dayOfWeek === "Sun") return false;
  if (dayOfWeek === "Sat") return t >= 9 && t < 13;
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
      const p = getISTparts();
      setTime({
        h: p.h.padStart(2, "0"),
        m: p.m.padStart(2, "0"),
        s: p.s.padStart(2, "0"),
      });
      setDateStr(
        `${p.dayNum} ${TR_MONTHS[p.month]} ${p.year} ${TR_DAYS[["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.dayOfWeek)]}`
      );
      setMarketOpen(isMarketOpen());
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
