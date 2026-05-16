// canlidoviz.com scraper — tek HTTP isteğiyle ~30 ürün
// HTML değişirse parser kırılır; o gün yedek kaynak ekleyeceğiz.

export type ScrapedPrice = {
  symbol: string;
  bid: number;
  ask: number;
};

// cid → bizim sembol
const SYMBOL_MAP: Record<string, string> = {
  // Döviz
  "1": "USD_TRY",
  "50": "EUR_TRY",
  "100": "GBP_TRY",
  // Altın
  "32": "GRAM_ALTIN",
  "12": "ONS_USD",
  "1179": "HAS_ALTIN",
  "11": "CEYREK_YENI",
  "1065": "CEYREK_ESKI",
  "47": "YARIM_YENI",
  "1066": "YARIM_ESKI",
  "14": "TAM_YENI",
  "1067": "TAM_ESKI",
  "27": "CUMHURIYET",
  "58": "ATA",
  "43": "RESAT",
  "18": "BILEZIK_22",
  "16": "AYAR_14",
  "55": "AYAR_18",
  "20": "GUMUS_TRY",
};

const PAIR_RE =
  /cid="(\d+)"[^>]*dt="(bA|amount)"[^>]*>\s*([\d.]+)/g;

export async function fetchCanlidoviz(): Promise<ScrapedPrice[]> {
  const res = await fetch("https://canlidoviz.com", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`canlidoviz HTTP ${res.status}`);
  }
  const html = await res.text();

  const pairs: Record<string, { bA?: number; amount?: number }> = {};
  for (const m of html.matchAll(PAIR_RE)) {
    const [, cid, dt, val] = m;
    if (!SYMBOL_MAP[cid]) continue;
    const num = parseFloat(val);
    if (!Number.isFinite(num)) continue;
    (pairs[cid] ||= {})[dt as "bA" | "amount"] = num;
  }

  const out: ScrapedPrice[] = [];
  for (const [cid, sym] of Object.entries(SYMBOL_MAP)) {
    const p = pairs[cid];
    if (!p || p.bA == null || p.amount == null) continue;
    out.push({ symbol: sym, bid: p.bA, ask: p.amount });
  }

  if (out.length === 0) {
    throw new Error("canlidoviz: parser hiç fiyat bulamadı (HTML değişmiş olabilir)");
  }
  return out;
}
