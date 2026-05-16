"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";
import type { NewsRow } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Props = {
  number: string;
  title: string;
  tier: "breaking" | "analiz" | "buyukresim";
  marker: string;
  accent: "down" | "warn" | "up";
  initial: NewsRow[];
  max?: number;
  minRelevance?: number;
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  });
}

function fmtAgo(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60_000; // minutes
  if (diff < 1) return "şimdi";
  if (diff < 60) return `${Math.floor(diff)}dk`;
  if (diff < 1440) return `${Math.floor(diff / 60)}sa`;
  return `${Math.floor(diff / 1440)}g`;
}

export function NewsTierCard({
  number,
  title,
  tier,
  marker,
  accent,
  initial,
  max = 8,
  minRelevance = 4,
}: Props) {
  const [news, setNews] = useState<NewsRow[]>(initial);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ch = supabase
      .channel(`news-${tier}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news",
          filter: `tier=eq.${tier}`,
        },
        (payload) => {
          const r = payload.new as NewsRow;
          setNews((prev) => {
            if (prev.find((p) => p.link === r.link)) return prev;
            return [r, ...prev].slice(0, max);
          });
          setNewIds((prev) => {
            const next = new Set(prev);
            next.add(r.id);
            return next;
          });
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(r.id);
              return next;
            });
          }, 4000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "news",
          filter: `tier=eq.${tier}`,
        },
        (payload) => {
          const r = payload.new as NewsRow;
          setNews((prev) =>
            prev.map((p) => (p.id === r.id ? { ...p, ...r } : p))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tier, max]);

  const accentColor =
    accent === "down"
      ? "text-[var(--accent-down)]"
      : accent === "warn"
        ? "text-[var(--accent-warn)]"
        : "text-[var(--accent-up)]";

  // AI henüz işlememişse (relevance=null) göster; işledikten sonra min eşiğin altındakileri gizle
  const filtered = news.filter(
    (n) => n.relevance == null || n.relevance >= minRelevance
  );

  const sourceCodes = Array.from(
    new Set(filtered.map((n) => n.source_code))
  ).slice(0, 4);

  return (
    <Panel
      number={number}
      title={
        <span className="inline-flex items-center gap-2">
          <span className={accentColor}>{marker}</span>
          {title}
        </span>
      }
      meta={sourceCodes.join(" · ") || "—"}
    >
      <ul className="space-y-1.5 text-[11px] leading-snug">
        {filtered.length === 0 && (
          <li className="text-[var(--text-muted)] opacity-70">
            Henüz haber yok — ilk cron beklemede.
          </li>
        )}
        {filtered.slice(0, max).map((n) => {
          const isNew = newIds.has(n.id);
          const isEn = n.region === "GLOBAL";
          const display = n.title_tr || n.title_original;
          const sentimentColor =
            n.sentiment === "positive"
              ? "text-[var(--accent-up)]"
              : n.sentiment === "negative"
                ? "text-[var(--accent-down)]"
                : n.sentiment === null
                  ? "text-[var(--text-faint)]"
                  : "text-[var(--text-muted)]";
          return (
            <li
              key={n.id}
              className={`grid grid-cols-[14px_38px_45px_1fr] items-baseline gap-1.5 border-b border-[var(--border-soft)] pb-1.5 last:border-b-0 transition-colors duration-500 ${
                isNew ? "bg-[var(--accent-warn)]/15" : ""
              }`}
            >
              <span className={sentimentColor} title={n.sentiment || "—"}>
                {isNew ? "●" : "●"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                {n.source_code}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[var(--text-faint)]">
                {fmtTime(n.published_at)}
              </span>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[var(--text)] hover:text-[var(--accent-gold)]"
                title={display}
              >
                {isEn && (
                  <span className="mr-1 inline-block border border-[var(--border)] px-1 text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    EN
                  </span>
                )}
                {display}
                <span className="ml-2 text-[9px] text-[var(--text-faint)]">
                  {fmtAgo(n.published_at)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
