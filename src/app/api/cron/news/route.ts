import { NextResponse } from "next/server";
import { fetchSource } from "@/lib/sources/rss";
import {
  SOURCES,
  TIER_INTERVAL_MINUTES,
  type NewsTier,
} from "@/lib/sources/news-sources";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secretFromQuery = url.searchParams.get("secret");
  const forceAll = url.searchParams.get("all") === "1";
  const expected = process.env.CRON_SECRET;

  if (
    !expected ||
    (auth !== `Bearer ${expected}` && secretFromQuery !== expected)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 }
    );
  }

  const started = Date.now();
  const minute = new Date().getMinutes();

  // Bu çağrıda hangi tier'lar çekilecek
  const activeTiers: NewsTier[] = forceAll
    ? ["breaking", "analiz", "buyukresim"]
    : (Object.keys(TIER_INTERVAL_MINUTES) as NewsTier[]).filter(
        (t) => minute % TIER_INTERVAL_MINUTES[t] === 0
      );

  if (activeTiers.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `minute=${minute}, no tier matched`,
      tookMs: Date.now() - started,
    });
  }

  const activeSources = SOURCES.filter((s) => activeTiers.includes(s.tier));
  const errors: Record<string, string> = {};
  const itemsBySource: Record<string, number> = {};

  // Paralel çek
  const results = await Promise.allSettled(
    activeSources.map((s) => fetchSource(s).then((items) => ({ src: s, items })))
  );

  const allItems: Awaited<ReturnType<typeof fetchSource>> = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const src = activeSources[i];
    if (r.status === "fulfilled") {
      allItems.push(...r.value.items);
      itemsBySource[src.code] = r.value.items.length;
    } else {
      errors[src.code] = String(r.reason).slice(0, 200);
    }
  }

  // Link'e göre dedupe (aynı çağrı içinde)
  const seen = new Set<string>();
  const unique = allItems.filter((it) => {
    if (seen.has(it.link)) return false;
    seen.add(it.link);
    return true;
  });

  let inserted = 0;
  if (unique.length > 0) {
    // upsert: link UNIQUE constraint, duplicate'ları gör mezden gel
    const { error, count } = await supabaseAdmin
      .from("news")
      .upsert(unique, { onConflict: "link", ignoreDuplicates: true, count: "exact" });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, tookMs: Date.now() - started },
        { status: 500 }
      );
    }
    inserted = count ?? 0;
  }

  return NextResponse.json({
    ok: true,
    minute,
    activeTiers,
    sourcesQueried: activeSources.length,
    itemsFetched: allItems.length,
    uniqueItems: unique.length,
    inserted,
    bySource: itemsBySource,
    errors: Object.keys(errors).length ? errors : undefined,
    tookMs: Date.now() - started,
  });
}
