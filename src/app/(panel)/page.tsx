import { createClient } from "@supabase/supabase-js";
import { TopBar } from "./_components/TopBar";
import { AtolyeCard } from "./_components/AtolyeCard";
import { SessionCard } from "./_components/SessionCard";
import { DailyChangeCard } from "./_components/DailyChangeCard";
import { DataSourcesCard } from "./_components/DataSourcesCard";
import { MainPricesCard } from "./_components/MainPricesCard";
import { AlertsCard } from "./_components/AlertsCard";
import { SarrafiyeTable } from "./_components/SarrafiyeTable";
import { NewsCard } from "./_components/NewsCard";
import { BriefingCard } from "./_components/BriefingCard";
import { ActivityCard } from "./_components/ActivityCard";
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

async function fetchSources() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb.from("latest_prices").select("source");
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[r.source] = (counts[r.source] || 0) + 1;
  return [
    {
      code: "MNT",
      name: "mynet · Kapalı Çarşı",
      count: counts["mynet_kc"] || 0,
      status: counts["mynet_kc"] ? ("live" as const) : ("down" as const),
    },
    {
      code: "CDZ",
      name: "canlıdöviz · döviz + ons",
      count: counts["canlidoviz"] || 0,
      status: counts["canlidoviz"] ? ("live" as const) : ("down" as const),
    },
    { code: "SBR", name: "Supabase Realtime", count: 1, status: "live" as const },
    { code: "CRN", name: "cron-job.org · 1 dk", count: 1, status: "live" as const },
  ];
}

export default async function PanelPage() {
  const symbols = [
    ...MAIN_SYMBOLS.map((m) => m.symbol),
    ...SARRAFIYE_SYMBOLS.map((m) => m.symbol),
  ];
  const [initial, history, sources] = await Promise.all([
    fetchInitial(),
    fetchHistory(symbols, 60),
    fetchSources(),
  ]);

  const mainInitial = Object.fromEntries(
    MAIN_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(
      ([, v]) => v
    )
  ) as Record<string, PriceRow>;
  const sarrafiyeInitial = Object.fromEntries(
    SARRAFIYE_SYMBOLS.map((m) => [m.symbol, initial[m.symbol]]).filter(
      ([, v]) => v
    )
  ) as Record<string, PriceRow>;
  const currentForDaily = Object.fromEntries(
    Object.entries(mainInitial).map(([k, v]) => [k, { ask: v.ask }])
  );

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text)]">
      <TopBar />
      <main className="grid grid-cols-12 gap-3 p-3">
        {/* Üst sıra */}
        <div className="col-span-12 lg:col-span-3">
          <AtolyeCard />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SessionCard />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <DailyChangeCard
            history={history}
            current={currentForDaily}
          />
        </div>

        {/* Orta sıra */}
        <div className="col-span-12 lg:col-span-3">
          <DataSourcesCard sources={sources} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <MainPricesCard initial={mainInitial} history={history} />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AlertsCard />
        </div>

        {/* Sarrafiye — geniş */}
        <div className="col-span-12 lg:col-span-8">
          <SarrafiyeTable initial={sarrafiyeInitial} history={history} />
        </div>

        {/* Yan sütun: brifing */}
        <div className="col-span-12 lg:col-span-4">
          <BriefingCard />
        </div>

        {/* Alt: haber + aktivite */}
        <div className="col-span-12 lg:col-span-8">
          <NewsCard />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <ActivityCard recent={[]} />
        </div>
      </main>
    </div>
  );
}
