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

const SYSTEM_PROMPT = `Sen bir kuyumcu atölyesi için çalışan altın piyasası haber editörüsün.
Görevin: Verilen ham haber başlığını TV ekranı için optimize etmek.

KURALLAR:
- Türkçe yaz (İngilizce gelirse çevir)
- Tek satır, max 60 karakter
- Yalın, yorum katma, başlık tarzında
- Sayı varsa koru ($47, %2.3 gibi)
- Kuruluş isimlerini kısalt: Federal Reserve → Fed, Türkiye Cumhuriyet Merkez Bankası → TCMB
- Clickbait kelimeleri sil: "İşte!", "Şok!", "Müthiş!", "Son dakika:"

sentiment ne demek (altın açısından):
- positive = altın YÜKSELTİCİ haber (Fed faiz indirimi, jeopolitik gerilim, enflasyon korkusu)
- negative = altın DÜŞÜRÜCÜ haber (faiz artırımı, dolar güçlenmesi, risk iştahı dönüşü)
- neutral = etkisi belirsiz

ÇIKTI: SADECE geçerli JSON, başka metin yok.`;

function buildUserPrompt(
  title: string,
  source: string,
  publishedAt: string | null
): string {
  return `HABER:
Başlık: "${title}"
Kaynak: ${source}
Tarih: ${publishedAt ?? "bilinmiyor"}

Çıktı formatı:
{
  "title_tr": "Türkçe temiz başlık, max 60 karakter",
  "summary_short": "Aynı başlık ama 40 karakter (TV ticker için)",
  "summary_medium": "1-2 cümle özet, max 200 karakter",
  "category": "altin | fed | tcmb | dolar | jeopolitik | enflasyon | diger",
  "sentiment": "positive | negative | neutral",
  "relevance": 1-10 sayı (altın fiyatına direkt etki, 10 = çok etkili),
  "impact_assets": ["ONS"|"GRAM_ALTIN"|"USD_TRY"|"EUR_TRY"]
}`;
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
    max_tokens: 400,
    system: SYSTEM_PROMPT,
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
