import { createClient } from "@supabase/supabase-js";
import { PriceGrid } from "./_components/PriceGrid";
import { StatusBar } from "./_components/StatusBar";
import { MAIN_SYMBOLS, type PriceRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchInitial(): Promise<Record<string, PriceRow>> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const symbols = MAIN_SYMBOLS.map((m) => m.symbol);
  const { data } = await sb
    .from("latest_prices")
    .select("*")
    .in("symbol", symbols);
  const map: Record<string, PriceRow> = {};
  for (const r of data ?? []) map[r.symbol] = r as PriceRow;
  return map;
}

export default async function PanelPage() {
  const initial = await fetchInitial();
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono">
      <StatusBar />
      <main className="p-8">
        <PriceGrid initial={initial} />
        <div className="mt-12 text-center text-xs opacity-30">
          ▁▂▃▄▅▆▇ sarrafiye · haberler · alarm · faz 2'de geliyor
        </div>
      </main>
    </div>
  );
}
