"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Panel } from "./Panel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Briefing = {
  id: number;
  date: string;
  content: string;
  news_count: number | null;
  created_at: string;
};

type Props = {
  number?: string;
  initial: Briefing | null;
};

function parseSections(content: string): {
  dun: string[];
  bugun: string[];
  yorum: string;
} {
  const dun: string[] = [];
  const bugun: string[] = [];
  let yorum = "";
  const lines = content.split(/\r?\n/).map((l) => l.trim());

  let section: "dun" | "bugun" | "yorum" | null = null;
  for (const l of lines) {
    if (!l) continue;
    if (/^DÜN NE OLDU/i.test(l)) {
      section = "dun";
      continue;
    }
    if (/^BUGÜN DİKKAT/i.test(l)) {
      section = "bugun";
      continue;
    }
    if (/^KISA YORUM/i.test(l) || /^YORUM/i.test(l)) {
      section = "yorum";
      continue;
    }
    const clean = l.replace(/^[-•*]\s*/, "").trim();
    if (!clean) continue;
    if (section === "dun") dun.push(clean);
    else if (section === "bugun") bugun.push(clean);
    else if (section === "yorum") yorum = (yorum + " " + clean).trim();
  }

  // Parse hata olursa ham metni yorum olarak göster
  if (dun.length === 0 && bugun.length === 0 && !yorum) {
    yorum = content;
  }
  return { dun, bugun, yorum };
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00+03:00");
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    weekday: "long",
  });
}

export function BriefingCard({ number = "10", initial }: Props) {
  const [briefing, setBriefing] = useState<Briefing | null>(initial);

  useEffect(() => {
    const ch = supabase
      .channel("briefings-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "briefings" },
        (payload) => {
          const r = payload.new as Briefing;
          if (!r) return;
          setBriefing((prev) => (prev && prev.date > r.date ? prev : r));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (!briefing) {
    return (
      <Panel number={number} title="GÜN BRİFİNGİ" meta="HENÜZ HAZIR DEĞİL">
        <div className="space-y-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
          <p>
            Sabah 08:00&apos;de son 24 saatin önemli haberlerinden otomatik
            brifing oluşturulacak.
          </p>
          <p className="text-[var(--text-faint)]">
            Claude Haiku · ayda ~30 çağrı · ~5 TL maliyet
          </p>
        </div>
      </Panel>
    );
  }

  const { dun, bugun, yorum } = parseSections(briefing.content);

  return (
    <Panel
      number={number}
      title="GÜN BRİFİNGİ"
      meta={`${fmtDate(briefing.date)} · ${briefing.news_count || 0} HABER`}
    >
      <div className="space-y-3 text-[11px] leading-relaxed">
        {dun.length > 0 && (
          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--accent-down)]">
              ▼ DÜN NE OLDU
            </div>
            <ul className="space-y-1 text-[var(--text)]">
              {dun.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--text-faint)]">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {bugun.length > 0 && (
          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--accent-warn)]">
              ◐ BUGÜN DİKKAT
            </div>
            <ul className="space-y-1 text-[var(--text)]">
              {bugun.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--text-faint)]">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {yorum && (
          <div className="border-t border-[var(--border-soft)] pt-2">
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--accent-up)]">
              ● KISA YORUM
            </div>
            <p className="italic text-[var(--text)]">{yorum}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
