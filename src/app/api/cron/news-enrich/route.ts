import { NextResponse } from "next/server";
import { enrichNews, hasStrongSignal } from "@/lib/anthropic";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Bir cron tetiklemesinde max kaç haber işlensin
const BATCH_SIZE = 10;
// Paralel kaç Haiku çağrısı
const CONCURRENCY = 4;
// Bu kadar saatten eski haberi enrich'e gönderme
const MAX_AGE_HOURS = 4;

async function processInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const settled = await Promise.allSettled(chunk.map(fn));
    results.push(...settled);
  }
  return results;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secretFromQuery = url.searchParams.get("secret");
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

  // title_tr olmayan + son MAX_AGE_HOURS saat içinde yayınlanmış haberleri al
  const minPublished = new Date(
    Date.now() - MAX_AGE_HOURS * 3600 * 1000
  ).toISOString();

  const { data: raw, error: fetchErr } = await sb
    .from("news")
    .select("id, title_original, source_name, published_at")
    .is("title_tr", null)
    .gte("published_at", minPublished)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(BATCH_SIZE * 3); // Geniş çek, zayıf sinyalli olanları eleyelim

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, error: fetchErr.message },
      { status: 500 }
    );
  }

  // Akıllı ön-filtre: güçlü sinyal yoksa AI'ya gönderme, "neutral" işaretle bitir
  const candidates = raw ?? [];
  const skipIds: number[] = [];
  const pending = candidates.filter((n) => {
    if (hasStrongSignal(n.title_original)) return true;
    skipIds.push(n.id);
    return false;
  });

  // Zayıf sinyallileri AI'ya gönderme — bir daha pending'e girmesinler diye
  // title_tr'yi orijinaliyle dolduruyoruz (UI değişmez, sadece tekrar işlenmez)
  if (skipIds.length > 0) {
    const skipped = candidates.filter((c) => skipIds.includes(c.id));
    // Tek tek update — supabase'de bulk-update-with-different-values yok
    await Promise.all(
      skipped.map((s) =>
        sb
          .from("news")
          .update({
            title_tr: s.title_original.slice(0, 120),
            sentiment: "neutral",
            relevance: 2,
            category: "diger",
          })
          .eq("id", s.id)
      )
    );
  }

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      candidates: candidates.length,
      preFiltered: skipIds.length,
      tookMs: Date.now() - started,
    });
  }

  const toProcess = pending.slice(0, BATCH_SIZE);

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  const settled = await processInBatches(toProcess, CONCURRENCY, async (n) => {
    try {
      const enriched = await enrichNews({
        title: n.title_original,
        source: n.source_name || "—",
        publishedAt: n.published_at,
      });
      const { error } = await sb
        .from("news")
        .update({
          title_tr: enriched.title_tr,
          summary_short: enriched.summary_short,
          summary_medium: enriched.summary_medium,
          category: enriched.category,
          sentiment: enriched.sentiment,
          relevance: enriched.relevance,
          impact_assets: enriched.impact_assets,
        })
        .eq("id", n.id);
      if (error) throw error;
      return { ok: true, id: n.id };
    } catch (err) {
      // AI başarısız → orijinali title_tr'ye yaz, neutral işaretle (tekrar denenmesin)
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await sb
          .from("news")
          .update({
            title_tr: n.title_original.slice(0, 120),
            sentiment: "neutral",
            relevance: 5,
          })
          .eq("id", n.id);
      } catch {
        /* ignore */
      }
      throw new Error(`id=${n.id}: ${msg}`);
    }
  });

  for (const r of settled) {
    if (r.status === "fulfilled") succeeded++;
    else {
      failed++;
      if (errors.length < 5) errors.push(r.reason?.message || String(r.reason));
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    preFiltered: skipIds.length,
    aiProcessed: toProcess.length,
    succeeded,
    failed,
    errors: errors.length ? errors : undefined,
    tookMs: Date.now() - started,
  });
}
