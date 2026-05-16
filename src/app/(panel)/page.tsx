import { createClient } from "@supabase/supabase-js";
import { TopBar } from "./_components/TopBar";
import { AtolyeCard } from "./_components/AtolyeCard";
import { SessionCard } from "./_components/SessionCard";
import { MainPricesCard } from "./_components/MainPricesCard";
import { BriefingCard } from "./_components/BriefingCard";
import { SarrafiyeTable } from "./_components/SarrafiyeTable";
import { AyarConverter } from "./_components/AyarConverter";
import { NewsTierCard } from "./_components/NewsTierCard";
import { AlertsCard } from "./_components/AlertsCard";
import { AlertBanner } from "./_components/AlertBanner";
import {
  MAIN_SYMBOLS,
  SARRAFIYE_SYMBOLS,
  type PriceRow,
  type NewsRow,
} from "@/lib/types";
import { fetchHistory } from "@/lib/history";
import { fetchKonyaWeather } from "@/lib/sources/openmeteo";
import { fetchKonyaPrayerTimes } from "@/lib/sources/prayer";
import { getBayramCountdown } from "@/lib/bayram";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sbAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function fetchPrices(): Promise<Record<string, PriceRow>> {
  const sb = sbAnon();
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

async function fetchAlerts() {
  const sb = sbAnon();
  const { data } = await sb
    .from("alerts")
    .select("id, symbol, condition, threshold, label, enabled")
    .order("symbol", { ascending: true });
  return (data ?? []) as Array<{
    id: number;
    symbol: string;
    condition: "above" | "below";
    threshold: number;
    label: string | null;
    enabled: boolean;
  }>;
}

async function fetchBriefing() {
  const sb = sbAnon();
  const { data } = await sb
    .from("briefings")
    .select("id, date, content, news_count, created_at")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function fetchNewsByTier(): Promise<Record<string, NewsRow[]>> {
  const sb = sbAnon();
  const tiers = ["breaking", "analiz", "buyukresim"];
  const out: Record<string, NewsRow[]> = {
    breaking: [],
    analiz: [],
    buyukresim: [],
  };
  await Promise.all(
    tiers.map(async (t) => {
      const { data } = await sb
        .from("news")
        .select(
          "id, source_code, source_name, tier, region, title_original, title_tr, link, published_at, sentiment, relevance, created_at"
        )
        .eq("tier", t)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(20);
      out[t] = (data ?? []) as NewsRow[];
    })
  );
  return out;
}

export default async function PanelPage() {
  const symbols = [
    ...MAIN_SYMBOLS.map((m) => m.symbol),
    ...SARRAFIYE_SYMBOLS.map((m) => m.symbol),
  ];
  const [initial, history, news, briefing, weather, prayerSet, alerts] =
    await Promise.all([
      fetchPrices(),
      fetchHistory(symbols, 60),
      fetchNewsByTier(),
      fetchBriefing(),
      fetchKonyaWeather(),
      fetchKonyaPrayerTimes(),
      fetchAlerts(),
    ]);
  const bayram = getBayramCountdown();

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
      <AlertBanner />
      <TopBar />
      <main className="grid grid-cols-12 items-start gap-3 p-3">
        {/* Üst sıra */}
        <div className="col-span-12 lg:col-span-3">
          <AtolyeCard />
        </div>
        <div className="col-span-12 lg:col-span-9">
          <SessionCard
            weather={weather}
            prayerSet={prayerSet}
            bayram={bayram}
          />
        </div>

        {/* Orta sıra — Ana fiyatlar + Alarm */}
        <div className="col-span-12 lg:col-span-8">
          <MainPricesCard initial={mainInitial} history={history} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <BriefingCard number="04" initial={briefing} />
          <AlertsCard number="06" initial={alerts} />
        </div>

        {/* Sarrafiye + Ayar çevirici */}
        <div className="col-span-12 lg:col-span-8">
          <SarrafiyeTable initial={sarrafiyeInitial} history={history} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <AyarConverter
            initialGramPrice={mainInitial["GRAM_ALTIN"] ?? null}
          />
        </div>

        {/* 3 katmanlı haber bandı */}
        <div className="col-span-12 lg:col-span-4">
          <NewsTierCard
            number="07"
            title="SON DAKİKA"
            tier="breaking"
            marker="●"
            accent="down"
            initial={news.breaking}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NewsTierCard
            number="08"
            title="PİYASA ANALİZ"
            tier="analiz"
            marker="◐"
            accent="warn"
            initial={news.analiz}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NewsTierCard
            number="09"
            title="BÜYÜK RESİM"
            tier="buyukresim"
            marker="○"
            accent="up"
            initial={news.buyukresim}
          />
        </div>
      </main>
    </div>
  );
}
