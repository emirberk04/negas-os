// canlidoviz.com scraper — ana sayfa (döviz) + altın sayfası birleştirilir
// HTML değişirse parser kırılır; o gün yedek kaynak ekleyeceğiz.

export type ScrapedPrice = {
  symbol: string;
  bid: number;
  ask: number;
};

// cid → bizim sembol
const SYMBOL_MAP: Record<string, string> = {
  // Döviz (ana sayfa)
  "1": "USD_TRY",
  "50": "EUR_TRY",
  "100": "GBP_TRY",
  // Altın (altın-fiyatlari sayfası)
  "32": "GRAM_ALTIN",
  "12": "ONS_USD",
  "1179": "HAS_ALTIN",
  "1065": "CEYREK_ESKI",
  "1066": "YARIM_ESKI",
  "14": "TAM_YENI",
  "1067": "TAM_ESKI",
  "43": "RESAT",
  "20": "GUMUS_TRY",
};

const PAIR_RE = /cid="(\d+)"[^>]*dt="(bA|amount)"[^>]*>\s*([\d.]+)/g;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPairs(url: string): Promise<Record<string, { bA?: number; amount?: number }>> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`canlidoviz HTTP ${res.status} on ${url}`);
  const html = await res.text();

  const pairs: Record<string, { bA?: number; amount?: number }> = {};
  for (const m of html.matchAll(PAIR_RE)) {
    const [, cid, dt, val] = m;
    if (!SYMBOL_MAP[cid]) continue;
    const num = parseFloat(val);
    if (!Number.isFinite(num)) continue;
    (pairs[cid] ||= {})[dt as "bA" | "amount"] = num;
  }
  return pairs;
}

export async function fetchCanlidoviz(): Promise<ScrapedPrice[]> {
  // Döviz ana sayfada, altın detay sayfasında — paralel çek, birleştir
  const [home, gold] = await Promise.all([
    fetchPairs("https://canlidoviz.com"),
    fetchPairs("https://canlidoviz.com/altin-fiyatlari"),
  ]);

  const merged: Record<string, { bA?: number; amount?: number }> = { ...home };
  for (const [cid, vals] of Object.entries(gold)) {
    // Altın sayfası daha geniş, mevcut altın ürünleri için altın sayfasını tercih et
    if (cid !== "1" && cid !== "50" && cid !== "100") {
      merged[cid] = vals;
    } else if (!merged[cid]) {
      merged[cid] = vals;
    }
  }

  const out: ScrapedPrice[] = [];
  for (const [cid, sym] of Object.entries(SYMBOL_MAP)) {
    const p = merged[cid];
    if (!p || p.bA == null || p.amount == null) continue;
    out.push({ symbol: sym, bid: p.bA, ask: p.amount });
  }

  if (out.length === 0) {
    throw new Error("canlidoviz: parser hiç fiyat bulamadı (HTML değişmiş olabilir)");
  }
  return out;
}
