import { createClient } from "@supabase/supabase-js";
import { PriceGrid } from "./_components/PriceGrid";
import { SarrafiyeTable } from "./_components/SarrafiyeTable";
import { StatusBar } from "./_components/StatusBar";
import { MAIN_SYMBOLS, SARRAFIYE_SYMBOLS, type PriceRow } from "@/lib/types";
import { fetchHistory } from "@/lib/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchInitial(): Promise<Record<string, PriceRow>> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const symbols = [
    ...MAIN_SYMBOLS.map((m) => m.symbol),
    ...SARRAFIYE_SYMBOLS.map((m) => m.symbol),
  ];
  const { data } = await sb
    .from("latest_prices")
    .select("*")
    .in("symbol", symbols);
  const map: Record<string, PriceRow> = {};
  for (const r of data ?? []) map[r.symbol] = r as PriceRow;
  return map;
}

export default async function PanelPage() {
  const symbols = [
    ...MAIN_SYMBOLS.map((m) => m.symbol),
    ...SARRAFIYE_SYMBOLS.map((m) => m.symbol),
  ];
  const [initial, history] = await Promise.all([
    fetchInitial(),
    fetchHistory(symbols, 60),
  ]);

  const mainInitial = Object.fromEntries(
    MAIN_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(
      ([, v]) => v
    )
  );
  const sarrafiyeInitial = Object.fromEntries(
    SARRAFIYE_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(
      ([, v]) => v
    )
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono">
      <StatusBar />
      <main className="space-y-8 p-8">
        <PriceGrid initial={mainInitial as Record<string, PriceRow>} />
        <SarrafiyeTable
          initial={sarrafiyeInitial as Record<string, PriceRow>}
          history={history}
        />
        <div className="text-center text-xs opacity-30">
          ▁▂▃▄▅▆▇ haberler · hesaplayıcı · alarm · faz 3'te geliyor
        </div>
      </main>
    </div>
  );
}
