export type PriceRow = {
  symbol: string;
  bid: number;
  ask: number;
  source: string;
  created_at: string;
};

export type SymbolMeta = {
  symbol: string;
  label: string;
  unit: string;
};

export const MAIN_SYMBOLS: SymbolMeta[] = [
  { symbol: "GRAM_ALTIN", label: "GRAM ALTIN", unit: "TL" },
  { symbol: "ONS_USD", label: "ONS ALTIN", unit: "$" },
  { symbol: "USD_TRY", label: "USD/TRY", unit: "TL" },
  { symbol: "EUR_TRY", label: "EUR/TRY", unit: "TL" },
];

export type NewsRow = {
  id: number;
  source_code: string;
  source_name: string | null;
  tier: "breaking" | "analiz" | "buyukresim";
  region: string;
  title_original: string;
  title_tr: string | null;
  link: string;
  published_at: string | null;
  sentiment: string | null;
  created_at: string;
};

export const SARRAFIYE_SYMBOLS: SymbolMeta[] = [
  { symbol: "CEYREK_YENI", label: "ÇEYREK YENİ", unit: "TL" },
  { symbol: "CEYREK_ESKI", label: "ÇEYREK ESKİ", unit: "TL" },
  { symbol: "YARIM_YENI", label: "YARIM YENİ", unit: "TL" },
  { symbol: "YARIM_ESKI", label: "YARIM ESKİ", unit: "TL" },
  { symbol: "TAM_YENI", label: "TAM YENİ", unit: "TL" },
  { symbol: "TAM_ESKI", label: "TAM ESKİ", unit: "TL" },
  { symbol: "CUMHURIYET", label: "CUMHURİYET", unit: "TL" },
  { symbol: "ATA", label: "ATA", unit: "TL" },
  { symbol: "RESAT", label: "REŞAT", unit: "TL" },
  { symbol: "HAS_ALTIN", label: "HAS ALTIN", unit: "TL" },
  { symbol: "AYAR_22", label: "22 AYAR", unit: "TL" },
  { symbol: "AYAR_18", label: "18 AYAR", unit: "TL" },
  { symbol: "AYAR_14", label: "14 AYAR", unit: "TL" },
  { symbol: "GUMUS_TRY", label: "GÜMÜŞ", unit: "TL" },
];
