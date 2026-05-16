import { NextResponse } from "next/server";
import { fetchCanlidoviz } from "@/lib/sources/canlidoviz";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
    const prices = await fetchCanlidoviz();
    const rows = prices.map((p) => ({
      symbol: p.symbol,
      bid: p.bid,
      ask: p.ask,
      source: "canlidoviz",
    }));
    const { error } = await supabaseAdmin.from("prices").insert(rows);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
      tookMs: Date.now() - started,
      symbols: rows.map((r) => r.symbol),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg, tookMs: Date.now() - started },
      { status: 500 }
    );
  }
}
