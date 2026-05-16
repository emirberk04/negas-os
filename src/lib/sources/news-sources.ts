export type NewsTier = "breaking" | "analiz" | "buyukresim";

export type NewsSource = {
  code: string;
  name: string;
  url: string;
  tier: NewsTier;
  region: "TR" | "GLOBAL";
  needsFilter: boolean;
};

export const SOURCES: NewsSource[] = [
  // 🔴 BREAKING
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

  // 🟡 ANALİZ
  {
    code: "INV-C",
    name: "Investing TR · Emtia",
    url: "https://tr.investing.com/rss/commodities.rss",
    tier: "analiz",
    region: "TR",
    needsFilter: false,
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
    needsFilter: false,
  },

  // 🟢 BÜYÜK RESİM
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
  // CNN Türk kaldırıldı — fazla spor/magazin gürültüsü vardı
];

export const TIER_INTERVAL_MINUTES: Record<NewsTier, number> = {
  breaking: 2,
  analiz: 5,
  buyukresim: 30,
};

// İLGİLİ kelimeler — bunlardan EN AZ BİRİ olmalı (word boundary ile)
const RELEVANT_REGEX = new RegExp(
  [
    // Doğrudan altın/kıymetli maden
    "alt[ıi]n", "ons", "kuyumcu", "k[ıi]ymetli maden", "g[üu]m[üu][şs]",
    "platin", "k[üu]l[çc]e", "ayar", "bilezik", "[çc]eyrek", "cumhuriyet",
    "re[şs]at", "ata alt[ıi]n", "has alt[ıi]n",
    // Makro
    "fed", "fomc", "faiz", "enflasyon", "t[üu]fe", "[üu]fe", "tcmb",
    "merkez banka", "para politikas[ıi]",
    "dolar", "usd", "euro", "eur", "d[öo]viz", "kur", "t[üu]rk liras[ıi]",
    "rezerv", "swap", "cari a[çc][ıi]k", "b[üu]t[çc]e",
    "[şs]im[şs]ek", "karahan", "erdo[ğg]an", "powell", "lagarde",
    "trump", "putin",
    // Jeopolitik (TR + EN)
    "iran", "[ıi]srail", "filistin", "rusya", "ukrayna", "[çc]in",
    "tarife", "sava[şs]", "ate[şs]kes", "yapt[ıi]r[ıi]m", "kriz",
    "orta do[ğg]u", "h[üu]rm[üu]z", "middle east",
    // Petrol/emtia (altını etkiler)
    "petrol", "brent", "wti", "opec", "ham petrol",
    // Piyasalar
    "borsa", "bist", "tahvil", "cds", "tahvil getiri",
    // English
    "gold", "silver", "precious", "bullion", "ounce", "inflation",
    "treasury", "dxy", "rate cut", "rate hike", "yield", "fomc",
  ].join("|"),
  "i"
);

// GÜRÜLTÜ kelimeler — ANY varsa direkt skip (RELEVANT match olsa bile)
const NOISE_REGEX = new RegExp(
  [
    // Spor
    "voleybol", "basketbol", "futbol", "tenis", "g[üu]re[şs]", "y[üu]zme",
    "fiba", "uefa", "fifa", "nba", "ma[çc]", "gol", "tak[ıi]m",
    "lig", "transfer", "fener", "gala\\b", "gala\\s", "be[şs]ikta[şs]",
    "trabzon", "form[üu]l\\s*1", "f1\\b", "europe cup", "champions",
    "[şs]ampiyona", "milli tak", "olimp",
    // Eğlence / magazin
    "magazin", "dizi", "sanat[çc]", "konser", "[şs]ark[ıi]c[ıi]",
    "sinema", "film[i\\s]", "oyuncu", "[üu]nl[üu]", "boşan", "evli",
    // Yerel/asayiş (ekonomik etkisi yok)
    "yang[ıi]n", "kaza", "[ıi]nfaz", "cinayet", "kavga", "[çc]ete",
    "uyu[şs]turucu", "kurye", "src belges",
    // Şirket portresi (haber değil reklam)
    "k[üu]p[üu]r", "r[öo]portaj", "anlatt[ıi]", "biyograf",
    // Hava/trafik
    "hava durumu", "trafik kapal", "yol yap[ıi]m",
    // Tekno reklam
    "digitaleurope",
  ].join("|"),
  "i"
);

export function isRelevant(title: string, source: NewsSource): boolean {
  if (!source.needsFilter) return true;
  // Önce: gürültü varsa direkt out
  if (NOISE_REGEX.test(title)) return false;
  // Sonra: ilgi kelimesi var mı
  return RELEVANT_REGEX.test(title);
}
