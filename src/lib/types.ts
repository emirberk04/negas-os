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
