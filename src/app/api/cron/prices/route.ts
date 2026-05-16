import { NextResponse } from "next/server";
import { fetchCanlidoviz } from "@/lib/sources/canlidoviz";
import { fetchMynetKapaliCarsi } from "@/lib/sources/mynet";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { symbol: string; bid: number; ask: number; source: string };

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

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 }
    );
  }

  const started = Date.now();
  const errors: string[] = [];

  // İki kaynağı paralel çek
  const [mynetRes, cdRes] = await Promise.allSettled([
    fetchMynetKapaliCarsi(),
    fetchCanlidoviz(),
  ]);

  // Mynet Kapalı Çarşı: altın ürünleri için öncelikli
  const merged: Record<string, Row> = {};
  if (mynetRes.status === "fulfilled") {
    for (const p of mynetRes.value) {
      merged[p.symbol] = { ...p, source: "mynet_kc" };
    }
  } else {
    errors.push(`mynet: ${mynetRes.reason}`);
  }

  // Canlidoviz: döviz + ons + mynet'te olmayanlar için
  if (cdRes.status === "fulfilled") {
    for (const p of cdRes.value) {
      if (!merged[p.symbol]) {
        merged[p.symbol] = { ...p, source: "canlidoviz" };
      }
    }
  } else {
    errors.push(`canlidoviz: ${cdRes.reason}`);
  }

  const rows = Object.values(merged);
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, errors, tookMs: Date.now() - started },
      { status: 500 }
    );
  }

  const { error } = await supabaseAdmin.from("prices").insert(rows);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, tookMs: Date.now() - started },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length,
    tookMs: Date.now() - started,
    bySource: rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {}),
    errors: errors.length ? errors : undefined,
  });
}
