import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Latest Haiku model — en ucuz, bu görev için fazlasıyla yeter
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export type EnrichedNews = {
  title_tr: string;
  summary_short: string;
  summary_medium: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance: number;
  impact_assets: string[];
};

const SYSTEM_PROMPT = `Kuyumcu atölyesi için altın piyasası haber editörüsün.
TV başlığı optimize et.

KURAL:
- Türkçe, max 60 karakter, tek satır
- Yalın başlık, yorum yok
- Sayıları koru ($47, %2.3)
- Kısalt: Federal Reserve→Fed, TCMB
- Clickbait sil: "Şok!", "İşte!", "Son dakika:"

sentiment (altın):
- positive = altın YÜKSELTİCİ (faiz indirimi, jeopolitik gerilim)
- negative = altın DÜŞÜRÜCÜ (faiz artırımı, dolar güçlenmesi)
- neutral = etkisiz

SADECE JSON döndür.`;

// "Mutlaka altınla alakalı" sayılan güçlü sinyaller — bunlardan biri yoksa AI'ya gönderme
const STRONG_SIGNALS = [
  "altın", "altin", "ons", "gram altın", "çeyrek", "cumhuriyet", "ata altın",
  "reşat", "has altın", "gümüş", "gumus", "platin", "külçe", "ayar", "bilezik",
  "fed", "fomc", "faiz", "enflasyon", "tüfe", "üfe", "tcmb", "merkez banka",
  "dolar", "usd", "euro", "eur", "döviz", "kur", "rezerv",
  "şimşek", "karahan", "powell", "lagarde", "trump", "erdoğan",
  "iran", "israil", "rusya", "ukrayna", "çin", "tarife", "savaş", "ateşkes",
  "petrol", "brent", "opec",
  "gold", "silver", "precious", "bullion", "inflation", "rate cut", "rate hike",
  "treasury", "dxy",
];

export function hasStrongSignal(title: string): boolean {
  const lower = title.toLowerCase();
  return STRONG_SIGNALS.some((kw) => lower.includes(kw));
}

function buildUserPrompt(
  title: string,
  source: string,
  _publishedAt: string | null
): string {
  return `Kaynak: ${source}
Başlık: "${title}"

JSON:
{"title_tr":"max 60 kar","summary_short":"max 40 kar","summary_medium":"1-2 cümle max 200 kar","category":"altin|fed|tcmb|dolar|jeopolitik|enflasyon|diger","sentiment":"positive|negative|neutral","relevance":1-10,"impact_assets":["ONS"|"GRAM_ALTIN"|"USD_TRY"|"EUR_TRY"]}`;
}

function safeJsonParse(text: string): unknown {
  // Bazı modeller ```json ile sarabilir
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(stripped);
}

export async function enrichNews(input: {
  title: string;
  source: string;
  publishedAt: string | null;
}): Promise<EnrichedNews> {
  const msg = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 220,
    // System prompt'u cache'le — ardarda çağrılarda %90 input maliyet düşer
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(input.title, input.source, input.publishedAt) }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = safeJsonParse(text) as Partial<EnrichedNews>;

  // Şema doğrulama + sanitization
  const sentiment = (
    ["positive", "negative", "neutral"] as const
  ).includes(parsed.sentiment as never)
    ? (parsed.sentiment as EnrichedNews["sentiment"])
    : "neutral";

  const relevance = Math.max(
    1,
    Math.min(10, Math.round(Number(parsed.relevance) || 5))
  );

  return {
    title_tr: String(parsed.title_tr || input.title).slice(0, 120),
    summary_short: String(parsed.summary_short || "").slice(0, 80),
    summary_medium: String(parsed.summary_medium || "").slice(0, 240),
    category: String(parsed.category || "diger").slice(0, 32),
    sentiment,
    relevance,
    impact_assets: Array.isArray(parsed.impact_assets)
      ? parsed.impact_assets.map((s) => String(s)).slice(0, 8)
      : [],
  };
}
