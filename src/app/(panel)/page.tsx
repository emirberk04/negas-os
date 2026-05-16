import { createClient } from "@supabase/supabase-js";
import { TopBar } from "./_components/TopBar";
import { AtolyeCard } from "./_components/AtolyeCard";
import { SessionCard } from "./_components/SessionCard";
import { MainPricesCard } from "./_components/MainPricesCard";
import { AlertsCard } from "./_components/AlertsCard";
import { SarrafiyeTable } from "./_components/SarrafiyeTable";
import { NewsCard } from "./_components/NewsCard";
import { BriefingCard } from "./_components/BriefingCard";
import {
  MAIN_SYMBOLS,
  SARRAFIYE_SYMBOLS,
  type PriceRow,
} from "@/lib/types";
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
    MAIN_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(([, v]) => v)
  ) as Record<string, PriceRow>;
  const sarrafiyeInitial = Object.fromEntries(
    SARRAFIYE_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(
      ([, v]) => v
    )
  ) as Record<string, PriceRow>;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text)]">
      <TopBar />
      <main className="grid grid-cols-12 gap-3 p-3">
        {/* Üst sıra — Atölye + Oturum */}
        <div className="col-span-12 lg:col-span-3">
          <AtolyeCard />
        </div>
        <div className="col-span-12 lg:col-span-9">
          <SessionCard />
        </div>

        {/* Orta sıra — Ana fiyatlar + Alarm */}
        <div className="col-span-12 lg:col-span-8">
          <MainPricesCard initial={mainInitial} history={history} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <AlertsCard />
        </div>

        {/* Sarrafiye geniş + brifing yan */}
        <div className="col-span-12 lg:col-span-8">
          <SarrafiyeTable initial={sarrafiyeInitial} history={history} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <BriefingCard />
        </div>

        {/* Alt — haber tam genişlik */}
        <div className="col-span-12">
          <NewsCard />
        </div>
      </main>
    </div>
  );
}
