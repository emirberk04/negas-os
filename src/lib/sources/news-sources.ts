export type NewsTier = "breaking" | "analiz" | "buyukresim";

export type NewsSource = {
  code: string; // 3-4 harf rozet
  name: string;
  url: string;
  tier: NewsTier;
  region: "TR" | "GLOBAL";
  needsFilter: boolean; // genel kategoriyse keyword filter zorunlu
};

export const SOURCES: NewsSource[] = [
  // 🔴 BREAKING — anlık, ham veri
  {
    code: "BHT",
    name: "Bloomberg HT",
    url: "https://www.bloomberght.com/rss",
    tier: "breaking",
    region: "TR",
    needsFilter: true,
  },
  {
    code: "FRX",
    name: "Foreks",
    url: "https://www.foreks.com/rss/",
    tier: "breaking",
    region: "TR",
    needsFilter: true,
  },

  // 🟡 ANALİZ — gün içi yorum
  {
    code: "INV-C",
    name: "Investing TR · Emtia",
    url: "https://tr.investing.com/rss/commodities.rss",
    tier: "analiz",
    region: "TR",
    needsFilter: false, // emtia spesifik
  },
  {
    code: "INV-F",
    name: "Investing TR · Döviz",
    url: "https://tr.investing.com/rss/forex.rss",
    tier: "analiz",
    region: "TR",
    needsFilter: false,
  },
  {
    code: "BGP",
    name: "Bigpara",
    url: "https://bigpara.hurriyet.com.tr/rss/",
    tier: "analiz",
    region: "TR",
    needsFilter: true,
  },
  {
    code: "DVZ",
    name: "Döviz.com",
    url: "https://www.doviz.com/news/rss",
    tier: "analiz",
    region: "TR",
    needsFilter: false, // döviz spesifik
  },

  // 🟢 BÜYÜK RESİM — derin analiz
  {
    code: "AA",
    name: "Anadolu Ajansı · Ekonomi",
    url: "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
    tier: "buyukresim",
    region: "TR",
    needsFilter: true,
  },
  {
    code: "EG",
    name: "Ekonomi Gazetesi",
    url: "https://www.ekonomigazetesi.com/rss.xml",
    tier: "buyukresim",
    region: "TR",
    needsFilter: true,
  },
  {
    code: "CNN",
    name: "CNN Türk",
    url: "https://www.cnnturk.com/feed/rss/news",
    tier: "buyukresim",
    region: "TR",
    needsFilter: true,
  },
];

// Tier'a göre saatte kaç kez çalışacak
export const TIER_INTERVAL_MINUTES: Record<NewsTier, number> = {
  breaking: 2,
  analiz: 5,
  buyukresim: 30,
};

// İlgi anahtar kelimeleri — Türkçe + İngilizce
export const RELEVANT_KEYWORDS = [
  // Doğrudan altın/kıymetli maden
  "altın", "altin", "gram altın", "çeyrek", "yarım", "tam altın",
  "cumhuriyet", "ata altın", "reşat", "ons", "kıymetli maden",
  "gümüş", "gumus", "platin", "külçe", "kulce", "has altın",
  "ayar", "bilezik",
  // Makro etkileyici
  "fed", "faiz", "enflasyon", "tüfe", "üfe", "tcmb", "merkez bankası",
  "dolar", "usd", "euro", "eur", "türk lirası", "döviz", "kur",
  "şimşek", "karahan", "erdoğan", "powell", "lagarde",
  "rezerv", "swap", "cari açık",
  // Jeopolitik
  "iran", "israil", "orta doğu", "rusya", "ukrayna", "çin", "tarife",
  "savaş", "ateşkes", "yaptırım", "opec", "petrol", "brent",
  // Piyasalar
  "borsa", "bist", "tahvil", "cds",
  // English
  "gold", "silver", "precious metals", "bullion", "ounce",
  "fomc", "inflation", "cpi", "ppi", "rate cut", "rate hike",
  "treasury", "yield", "dxy",
];

export function isRelevant(title: string, source: NewsSource): boolean {
  if (!source.needsFilter) return true;
  const lower = title.toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
}
