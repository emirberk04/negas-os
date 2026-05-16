import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

export type Tick = { ts: number; ask: number };

export async function fetchHistory(
  symbols: string[],
  minutes = 60
): Promise<Record<string, Tick[]>> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await sb()
    .from("prices")
    .select("symbol, ask, created_at")
    .in("symbol", symbols)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error || !data) return {};

  const out: Record<string, Tick[]> = {};
  for (const r of data) {
    const t = new Date(r.created_at).getTime();
    (out[r.symbol] ||= []).push({ ts: t, ask: Number(r.ask) });
  }
  return out;
}
