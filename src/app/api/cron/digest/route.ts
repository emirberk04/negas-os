import { NextResponse } from "next/server";
import { generateBriefing } from "@/lib/anthropic";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_RELEVANCE = 6;
const MAX_NEWS = 35;

function trDateKey(): string {
  // IST takvim günü (UTC+3)
  const d = new Date(Date.now() + 3 * 3600_000);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secretFromQuery = url.searchParams.get("secret");
  const force = url.searchParams.get("force") === "1";
  const expected = process.env.CRON_SECRET;

  if (
    !expected ||
    (auth !== `Bearer ${expected}` && secretFromQuery !== expected)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.AI_ENABLED !== "true") {
    return NextResponse.json({ ok: false, skipped: "AI_ENABLED=false" });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 }
    );
  }
  const sb = supabaseAdmin;
  const started = Date.now();
  const date = trDateKey();

  // Bugünün brifingi varsa atla (force ile zorlayabiliriz)
  if (!force) {
    const { data: existing } = await sb
      .from("briefings")
      .select("id")
      .eq("date", date)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        skipped: "already exists",
        date,
        tookMs: Date.now() - started,
      });
    }
  }

  // Son 24 saatin önemli haberleri
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: news, error: nErr } = await sb
    .from("news")
    .select("title_tr, title_original, sentiment, relevance, source_code, category")
    .gte("published_at", since)
    .gte("relevance", MIN_RELEVANCE)
    .order("relevance", { ascending: false })
    .limit(MAX_NEWS);

  if (nErr) {
    return NextResponse.json(
      { ok: false, error: nErr.message },
      { status: 500 }
    );
  }
  if (!news || news.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "not enough relevant news in last 24h",
      tookMs: Date.now() - started,
    });
  }

  // Piyasa bağlamı: bugünkü en taze ana fiyatlar + son 24sa değişim
  const { data: prices } = await sb
    .from("prices")
    .select("symbol, ask, created_at")
    .in("symbol", ["GRAM_ALTIN", "ONS_USD", "USD_TRY", "EUR_TRY"])
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const byFirst: Record<string, number> = {};
  const byLast: Record<string, number> = {};
  for (const p of prices ?? []) {
    if (byFirst[p.symbol] == null) byFirst[p.symbol] = Number(p.ask);
    byLast[p.symbol] = Number(p.ask);
  }

  const fmtPct = (sym: string) => {
    const a = byFirst[sym];
    const b = byLast[sym];
    if (a == null || b == null) return "—";
    const pct = ((b - a) / a) * 100;
    const arrow = pct >= 0 ? "▲" : "▼";
    return `${b.toFixed(2)} ${arrow} ${pct.toFixed(2)}%`;
  };

  const priceContext = [
    `GRAM ALTIN: ${fmtPct("GRAM_ALTIN")}`,
    `ONS USD: ${fmtPct("ONS_USD")}`,
    `USD/TRY: ${fmtPct("USD_TRY")}`,
    `EUR/TRY: ${fmtPct("EUR_TRY")}`,
  ].join("\n");

  const newsLines = news.map(
    (n) =>
      `[${(n.sentiment || "neutral")[0].toUpperCase()}] ${(n.title_tr || n.title_original || "").slice(0, 110)}`
  );

  try {
    const result = await generateBriefing({ newsLines, priceContext });

    const { error: insErr } = await sb.from("briefings").upsert(
      {
        date,
        content: result.content,
        news_count: news.length,
        model: "claude-haiku-4-5",
      },
      { onConflict: "date" }
    );
    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      date,
      newsUsed: news.length,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      tookMs: Date.now() - started,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg, tookMs: Date.now() - started },
      { status: 500 }
    );
  }
}
