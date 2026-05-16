// mynet.com Kapalı Çarşı altın fiyatları — Harem'e en yakın gerçek piyasa
// Kaynak: https://finans.mynet.com/altin/kapali-carsi/

export type ScrapedPrice = {
  symbol: string;
  bid: number;
  ask: number;
};

const TITLE_MAP: Record<string, string> = {
  "Gram Altın": "GRAM_ALTIN",
  "Çeyrek Altın": "CEYREK_YENI",
  "Yarım Altın": "YARIM_YENI",
  "Cumhuriyet Altını": "CUMHURIYET",
  "Ata Altın": "ATA",
  "Gremse Altın": "GREMSE",
  "Beşli Altın": "BESLI",
  "İkibuçuk Altın": "IKIBUCUK",
  "Ziynet Altın": "ZIYNET",
  "14 Ayar Saf Altın Gram/TL": "AYAR_14",
  "18 Ayar Saf Altın Gram/TL": "AYAR_18",
  "22 Ayar Saf Altın Gram/TL": "AYAR_22",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&ouml;/g, "ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&uuml;/g, "ü")
    .replace(/&Ggreve;/g, "Ğ")
    .replace(/&Scedil;/g, "Ş")
    .replace(/&scedil;/g, "ş")
    .replace(/&amp;/g, "&");
}

function parseTr(num: string): number {
  return parseFloat(num.replace(/\./g, "").replace(",", "."));
}

export async function fetchMynetKapaliCarsi(): Promise<ScrapedPrice[]> {
  const res = await fetch("https://finans.mynet.com/altin/kapali-carsi/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mynet HTTP ${res.status}`);
  const html = await res.text();

  const tbody = html.match(/<tbody[^>]*>([\s\S]+?)<\/tbody>/);
  if (!tbody) throw new Error("mynet: tbody bulunamadı");

  const out: ScrapedPrice[] = [];
  const seen = new Set<string>();

  for (const tr of tbody[1].matchAll(/<tr[^>]*>([\s\S]+?)<\/tr>/g)) {
    const content = tr[1];
    const titleMatch = content.match(/title="([^"]+)"/);
    const tds = [...content.matchAll(/<td class="text-center">([\d.,]+)<\/td>/g)];
    if (!titleMatch || tds.length < 3) continue;

    const title = decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
    const sym = TITLE_MAP[title];
    if (!sym || seen.has(sym)) continue;

    // tds: [son, alış, satış]
    const bid = parseTr(tds[1][1]);
    const ask = parseTr(tds[2][1]);
    if (!Number.isFinite(bid) || !Number.isFinite(ask)) continue;

    out.push({ symbol: sym, bid, ask });
    seen.add(sym);
  }

  if (out.length === 0) {
    throw new Error("mynet: hiç fiyat parse edilemedi (HTML değişmiş olabilir)");
  }
  return out;
}
