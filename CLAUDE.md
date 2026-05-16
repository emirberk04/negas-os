# NEGAŞ OS // v0.1

> NEGAŞ atölyesi için canlı altın/döviz operasyon paneli. Dükkanda TV'de gösterilir, müşteri de görür. Terminal/Bloomberg estetiği, monospace, koyu tema. Sıfır bütçe — sadece ücretsiz API'ler ve free tier servisler.

---

## 🎯 Proje Vizyonu

NEGAŞ atölyesine asılı 40-55" TV'de tam ekran çalışan, canlı veri akışlı bir "operasyon paneli". Müşteri içeri girdiğinde "NEGAŞ" logosunu büyük puntoyla görsün, altında saniye saniye güncellenen altın fiyatları aksın, profesyonel bir kuruluşa girdiğini hissetsin. Sen tezgahta otururken bir bakışta gram altın, ons, döviz, makas, haberler, alarmları görebil.

**Felsefe:** Bilgi yoğun ama gürültüsüz. Bloomberg Terminal soğukluğu + Burhan OS şıklığı + NEGAŞ kimliği. Her piksel anlamlı olsun.

**Marka:** NEGAŞ adı her ekranda görünür ama bağırmaz — sol üstte `NEGAŞ OS // v1.0` şeklinde monospace, sade. Logo veya stilize formu varsa header'a entegre edilir.

---

## 🏗️ Teknik Mimari

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14 App Router @ Vercel)              │
│  - Server Components + Client Components                │
│  - Tailwind + JetBrains Mono / IBM Plex Mono           │
│  - Supabase Realtime (WebSocket) ile live updates      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  SUPABASE (Free Tier — 500MB DB, 2GB transfer/ay)       │
│  - prices (tarihsel fiyat arşivi)                       │
│  - news (haber arşivi + AI etiketleri)                  │
│  - alerts (kullanıcı tanımlı eşik alarmları)            │
│  - settings (işçilik %, müşteri Q&A vs.)                │
│  - Realtime subscription → frontend                     │
└────────────────────▲────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│  VERCEL CRON JOBS (Free — Hobby plan)                   │
│  - /api/cron/prices    her 1 dk                         │
│  - /api/cron/news      her 5 dk                         │
│  - /api/cron/digest    sabah 08:00 (Claude API)         │
│  - /api/cron/cleanup   gece 03:00 (eski veri temizliği) │
└─────────────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬──────────────┐
        ▼                         ▼              ▼
   [Altın/Döviz APIs]      [Haber RSS]     [Yardımcı APIs]
   - haremapi.tr           - sabah.com.tr  - Open-Meteo (hava)
   - altinapi.com          - sozcu RSS     - Diyanet (namaz)
   - TCMB XML (yedek)      - investing TR  - Hicri takvim
   - GoldAPI.io (yedek)    - bloomberght
```

**Stack özet:**
- Frontend: **Next.js 14**, Tailwind, Framer Motion (subtle animasyonlar)
- Backend: Next.js API Routes + Vercel Cron
- DB: **Supabase** (Postgres + Realtime + Storage)
- AI: **Anthropic Claude API** (sadece haber özeti + Q&A, ayda ~5$)
- Deploy: **Vercel** (Hobby plan, ücretsiz)
- Tipografi: **JetBrains Mono** (sayılar için), **Inter** (gerekli yerlerde başlık)

**Tahmini aylık maliyet: 0 TL** (Claude API kullanırsan ~150 TL)

---

## 📦 Faz Bazlı Geliştirme Planı

Her faz **çalışan bir panel** çıkarır. Her fazda commit at, deploy et, dükkana as. Sonraki faza geç.

---

### **FAZ 0 — Hazırlık & Kurulum** ⏱️ ~1 saat

**Hedef:** Boş Next.js projesi Vercel'de yayında.

#### Adımlar
1. Next.js 14 projesi oluştur:
   ```bash
   npx create-next-app@latest negas-os --typescript --tailwind --app --src-dir
   cd negas-os
   ```
2. GitHub repo aç, ilk commit.
3. **Supabase** projesi oluştur (ücretsiz hesap, yeni proje, region: Frankfurt).
   - `.env.local` içine: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. **Vercel**'e bağla, deploy et. `negas-os.vercel.app` çalışır olsun.
5. Custom domain alacaksan şimdi bağla (opsiyonel, `panel.negas.com.tr` veya `negas-os.com` gibi).
6. **API key kayıtları:**
   - haremapi.tr → ücretsiz hesap → API key al
   - Open-Meteo → key gerektirmiyor
   - Anthropic Console → API key al (Faz 4 için)

#### Çıktı
- Vercel'de yayında boş bir Next.js sayfası.
- Supabase bağlantısı test edildi.

---

### **FAZ 1 — Canlı Fiyat Çekirdeği** ⏱️ ~3-4 saat

**Hedef:** Gram altın TL, ons USD, USD/TRY, EUR/TRY canlı görünsün. En kritik faz.

#### 1.1 — Supabase tabloları

```sql
-- Fiyat geçmişi
CREATE TABLE prices (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,        -- 'GRAM_ALTIN', 'ONS_USD', 'USD_TRY', 'EUR_TRY'
  bid NUMERIC,                  -- alış
  ask NUMERIC,                  -- satış
  change_pct NUMERIC,           -- günlük % değişim
  day_high NUMERIC,
  day_low NUMERIC,
  source TEXT,                  -- 'haremapi', 'altinapi', 'tcmb'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prices_symbol_time ON prices(symbol, created_at DESC);

-- Son fiyat view (frontend tek bu view'i sorgular)
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (symbol) *
FROM prices
ORDER BY symbol, created_at DESC;
```

#### 1.2 — Cron job: `/api/cron/prices`

```typescript
// app/api/cron/prices/route.ts
export async function GET(req: Request) {
  // 1. Vercel Cron secret doğrula
  // 2. haremapi.tr'den fiyatları çek (REST endpoint)
  // 3. İlgili sembolleri map'le:
  //    - 'ALTIN' → GRAM_ALTIN
  //    - 'ONS' → ONS_USD
  //    - 'USDTRY' → USD_TRY
  //    - 'EURTRY' → EUR_TRY
  //    - 'YENİ ÇEYREK' → CEYREK_YENI
  //    - 'YENİ TAM' → TAM_YENI
  //    - 'YENİ ATA' → ATA_YENI
  //    - 'YENİ YARIM' → YARIM_YENI
  //    - 'CUMHURIYET' → CUMHURIYET (eski tam'dan türetilebilir)
  //    - 'HAS_ALTIN', '22_AYAR', '14_AYAR'
  // 4. Supabase'e batch insert
  // 5. Hata olursa altinapi.com'a fallback
  // 6. O da olmazsa TCMB XML'e (son çare)
}
```

**`vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/prices", "schedule": "* * * * *" }
  ]
}
```

> ⚠️ Vercel Hobby planında cron minimum 1 dakika. 30 saniye için Faz 6'da Supabase Edge Function'a geçebiliriz, şimdilik 1 dk yeter.

#### 1.3 — Frontend: Ana fiyat kartları

Layout: TV için 16:9 optimize, **1920x1080**.

```
┌──────────────────────────────────────────────────────────┐
│ NEGAŞ OS // v1.0                          14:39 IST  LIVE │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────┐  │
│ │ 01 // GRAM ALTIN    │ │ 02 // ONS ALTIN             │  │
│ │ ALIŞ   6.655,14 TL  │ │ ALIŞ   4.554,27 $           │  │
│ │ SATIŞ  6.655,86 TL  │ │ SATIŞ  4.554,86 $           │  │
│ │ ▲ +1,23%            │ │ ▼ -2,06%                    │  │
│ └─────────────────────┘ └─────────────────────────────┘  │
│ ┌─────────────────────┐ ┌─────────────────────────────┐  │
│ │ 03 // USD/TRY       │ │ 04 // EUR/TRY               │  │
│ │ ...                 │ │ ...                         │  │
│ └─────────────────────┘ └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Supabase Realtime ile:**
```typescript
const channel = supabase
  .channel('prices')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'prices'
  }, payload => {
    // State güncelle, kart yanıp sönsün (yeşil/kırmızı flash)
  })
  .subscribe();
```

**Görsel detaylar:**
- Sayılar **JetBrains Mono Bold**, büyük (48-72px).
- Fiyat değişimi: yukarı = `#7FB069` (soft yeşil), aşağı = `#D17B7B` (soft kırmızı).
- Flash animasyon: fiyat değişince 0.5sn arka plan rengi.
- "STALE" göstergesi: son güncellemeden 90sn geçtiyse sağ üstte kırmızı nokta.

#### Çıktı
- TV'ye asılan panelde 4 ana fiyat canlı akıyor.
- Veriler Supabase'e birikiyor (gelecek faz grafikleri için).

---

### **FAZ 2 — Sarrafiye + Genişletilmiş Fiyatlar** ⏱️ ~2 saat

**Hedef:** Çeyrek, yarım, tam, cumhuriyet, ATA, has altın, 22/14 ayar.

#### 2.1 — Eski/Yeni ayrımı

Harem API zaten "YENİ ÇEYREK" / "ESKİ ÇEYREK" ayırıyor — ikisini de göster çünkü piyasa farklı fiyatlıyor.

#### 2.2 — Layout: Sarrafiye paneli

Ana fiyatların altında bir **grid tablo**:

```
05 // SARRAFİYE                                     11 ÜRÜN
─────────────────────────────────────────────────────────
ÇEYREK YENİ   ALIŞ 10.838  SATIŞ 10.916  ▲ +0,8%  [▁▂▃▄]
ÇEYREK ESKİ   ALIŞ 10.720  SATIŞ 10.800  ▲ +0,7%  [▁▂▃▄]
YARIM YENİ    ...
TAM YENİ      ...
ATA YENİ      ...
CUMHURIYET    ...
HAS ALTIN     ...
22 AYAR       ...
14 AYAR       ...
GÜMÜŞ TL      ...
PLATİN ONS    ...
─────────────────────────────────────────────────────────
```

Sağ tarafta küçük **sparkline** (son 60 dakika). `react-sparklines` kütüphanesi, veri Supabase'den.

#### 2.3 — Spread (Makas) göstergesi

Her kartta küçük etiket:
```
MAKAS  0,72 TL / 0,01%
```

#### Çıktı
- 11+ sarrafiye ürünü canlı.
- Her ürünün son 1 saatlik mini-grafik.
- Spread/makas anında görünür.

---

### **FAZ 3 — Hesaplayıcı + İşçilik** ⏱️ ~3 saat

**Hedef:** Tezgah önündeki müşteri için bilgi paneli.

#### 3.1 — Gram hesaplayıcı widget

Sağ alt köşede sabit kalan büyük bir panel:

```
┌─────────────────────────────────────┐
│ 06 // HESAPLAYICI                   │
│                                     │
│ [   8.5  ] GRAM   [22 AYAR ▼]      │
│                                     │
│ KARŞILIĞI                           │
│ ALIŞ:  56.580 TL                    │
│ SATIŞ: 56.591 TL                    │
│                                     │
│ + İŞÇİLİK %15  → 65.080 TL          │
└─────────────────────────────────────┘
```

**Mantık:**
- Gram fiyat × ayar katsayısı (24k=1, 22k=0.916, 18k=0.750, 14k=0.585, 8k=0.333)
- İşçilik yüzdesi `settings` tablosundan, sen değiştirebilirsin.
- Mobil/tablet için ayrı route: `/hesapla` — büyük dokunmatik klavye.

#### 3.2 — Settings sayfası `/admin`

Basit şifre korumalı sayfa (NextAuth veya simple cookie):
- İşçilik yüzdesi (kategori bazlı: bilezik, kolye, yüzük, set, hurda)
- Alarm eşikleri (Faz 7)
- Müşteri Q&A açma/kapama

#### Çıktı
- Tezgahta tablet/telefonla anlık hesap.
- TV'de hesaplayıcı widget'ı görsel olarak.

---

### **FAZ 4 — Haber Akışı (RSS)** ⏱️ ~4 saat

**Hedef:** Altını etkileyebilecek son dakika haberleri canlı kayıyor — hem Türkiye, hem dünya. Müşteri ekranı görünce "vay be, Bloomberg gibi" desin.

#### 4.0 — Haber kaynak felsefesi

**Önce şunu net koy:** Haberler 3 katmana ayrılır, hepsi farklı amaca hizmet eder:

1. **🔴 BREAKING (anlık, ham veri)** — "Karahan: Faiz koridoru..." tipi tek satırlık piyasa tweet'leri. Bloomberg HT'nin son dakika sayfası bu tür haberle dolu. Müşteri içeri girince akan şerit gibi gözükmeli.
2. **🟡 ANALİZ (gün içi)** — "Ons altın 4.700 direncini kırdı, sebebi şu" gibi yorum/açıklama haberleri. Kitco News, Investing emtia, Bigpara altın.
3. **🟢 BÜYÜK RESİM (günde 1-2 kez)** — "Pierre Lassonde: Altın $17.250'ye gidecek" tipi makro analiz. Reuters, Bloomberg.com, World Gold Council.

Her katman farklı sıklıkta ve farklı görsel ağırlıkta gösterilir.

#### 4.1 — TÜRKİYE kaynakları (öncelik sırasıyla)

| Kaynak | RSS URL | Tier | Sıklık | Neden |
|---|---|---|---|---|
| **Bloomberg HT** | `https://www.bloomberght.com/rss` | 🔴 BREAKING | 2 dk | TR'de en hızlı, son dakika piyasa tweet'leri stili. Karahan/Şimşek açıklamaları **canlı** düşer. |
| **Bigpara Altın** | `https://bigpara.hurriyet.com.tr/rss/` | 🟡 ANALİZ | 5 dk | Hürriyet bünyesinde, altın özel kategorisi var, analiz ağırlıklı |
| **Investing.com TR — Emtia** | `https://tr.investing.com/rss/commodities.rss` | 🟡 ANALİZ | 5 dk | Altın/gümüş/petrol global yorum, profesyonel kaynak |
| **Investing.com TR — Döviz** | `https://tr.investing.com/rss/forex.rss` | 🟡 ANALİZ | 5 dk | USD/TRY hareketleri altını direkt etkiler |
| **Foreks** | `https://www.foreks.com/rss/` | 🔴 BREAKING | 5 dk | Profesyonel trader kaynağı, özet veri |
| **Sabah Finans-Altın** | `https://www.sabah.com.tr/rss/finansaltin-haberleri.xml` | 🟡 ANALİZ | 10 dk | Halka açık, altın özel kategori, mainstream dil |
| **Döviz.com** | `https://www.doviz.com/news/rss` | 🟡 ANALİZ | 10 dk | Döviz ve altın spesifik |
| **Ekonomi Gazetesi** | `https://www.ekonomigazetesi.com/rss.xml` | 🟢 BÜYÜK RESİM | 30 dk | Kurumsal/derin analiz |
| **AA Ekonomi** | `https://www.aa.com.tr/tr/rss/default?cat=ekonomi` | 🟢 BÜYÜK RESİM | 30 dk | Anadolu Ajansı — resmi kaynak, TCMB açıklamaları |
| **CNN Türk Finans** | `https://www.cnnturk.com/feed/rss/news` | 🟢 BÜYÜK RESİM | 30 dk | Backup, mainstream |

#### 4.2 — DÜNYA kaynakları (öncelik sırasıyla)

| Kaynak | RSS URL | Tier | Sıklık | Neden |
|---|---|---|---|---|
| **Kitco News** | `https://www.kitco.com/rss/KitcoNews.xml` | 🔴 BREAKING | 5 dk | **Dünyada altın haberinde 1 numara.** "Gold sheds $47 as rate-hike fears..." tipi. |
| **Reuters Commodities** | `https://www.reutersagency.com/feed/?best-topics=commodities` | 🟡 ANALİZ | 10 dk | En güvenilir global kaynak, hızlı |
| **Bloomberg Markets** | (RSS yok, scraping veya Bloomberg API gerekir) | 🟢 BÜYÜK RESİM | 30 dk | İsteğe bağlı — bedava değil |
| **Mining.com Gold** | `https://www.mining.com/tag/gold/feed/` | 🟢 BÜYÜK RESİM | 30 dk | Madencilik tarafı, üretim haberleri |
| **World Gold Council** | `https://www.gold.org/feeds/news` | 🟢 BÜYÜK RESİM | 60 dk | Resmi kaynak, talep/arz raporları |
| **Trading Economics Gold** | `https://tradingeconomics.com/commodity/gold` (scraping) | 🟡 ANALİZ | 15 dk | Veri + kısa açıklama |
| **FXStreet Gold** | `https://www.fxstreet.com/rss/news` | 🟡 ANALİZ | 10 dk | Teknik analiz ağırlıklı |

#### 4.3 — Supabase tablosu

```sql
CREATE TABLE news (
  id BIGSERIAL PRIMARY KEY,
  source_code TEXT NOT NULL,      -- 'BHT', 'KTC', 'BGP', 'INV-C', 'AA'
  source_name TEXT,                -- 'Bloomberg HT', 'Kitco News'
  tier TEXT NOT NULL,              -- 'breaking', 'analiz', 'buyukresim'
  region TEXT NOT NULL,            -- 'TR', 'GLOBAL'
  
  title_original TEXT NOT NULL,    -- orijinal başlık (TR veya EN)
  title_tr TEXT,                   -- AI çevirisi (EN ise) + temizlenmiş TR
  summary_short TEXT,              -- AI özet, max 80 karakter (TV için)
  summary_medium TEXT,             -- AI özet, max 200 karakter (tooltip için)
  
  link TEXT UNIQUE NOT NULL,       -- duplicate engelleme
  published_at TIMESTAMPTZ,
  
  -- AI etiketleri (Faz 5'te dolacak)
  category TEXT,                   -- 'altin', 'fed', 'jeopolitik', 'tcmb', 'dolar'
  sentiment TEXT,                  -- 'positive', 'negative', 'neutral'
  relevance INT,                   -- 1-10, altına direkt etki
  impact_assets TEXT[],            -- ['GRAM_ALTIN', 'ONS', 'USD_TRY']
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_time ON news(published_at DESC);
CREATE INDEX idx_news_tier ON news(tier, published_at DESC);
```

#### 4.4 — Cron job stratejisi

Vercel Hobby cron limiti yüzünden tek endpoint multi-task:

```typescript
// app/api/cron/news/route.ts
export async function GET(req: Request) {
  // Tier'a göre hangi kaynakları çekeceğini belirle
  const minute = new Date().getMinutes();
  
  const sources: SourceConfig[] = [];
  
  // BREAKING — her 2 dakikada
  if (minute % 2 === 0) {
    sources.push(BHT, KITCO, FOREKS);
  }
  
  // ANALİZ — her 5 dakikada
  if (minute % 5 === 0) {
    sources.push(BIGPARA, INVESTING_COMMODITIES, INVESTING_FOREX, SABAH_GOLD, REUTERS);
  }
  
  // BÜYÜK RESİM — her 30 dakikada
  if (minute % 30 === 0) {
    sources.push(AA, CNN, MINING, GOLD_ORG);
  }
  
  for (const src of sources) {
    const feed = await parser.parseURL(src.url);
    for (const item of feed.items) {
      // Sadece altın/ekonomi alakalısı al — keyword filter
      if (!isRelevant(item.title)) continue;
      
      // Duplicate check by link
      await supabase.from('news').upsert({ ... }, { onConflict: 'link' });
    }
  }
}
```

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/news", "schedule": "*/2 * * * *" }
  ]
}
```

#### 4.5 — Keyword filtreleme (gürültü azaltma)

Bloomberg HT'nin RSS'i her şeyi atıyor (spor, magazin bile geliyor). Sadece altınla ilgili olanları al:

```typescript
const RELEVANT_KEYWORDS_TR = [
  // Doğrudan
  'altın', 'gram altın', 'çeyrek', 'cumhuriyet', 'ata', 'ons', 'kıymetli maden',
  'gümüş', 'platin', 'külçe',
  // Etkileyici makro
  'fed', 'faiz', 'enflasyon', 'tüfe', 'üfe', 'tcmb', 'merkez bankası',
  'dolar', 'usd', 'euro', 'eur', 'türk lirası', 'döviz', 'kur',
  'şimşek', 'karahan', 'erdoğan', 'powell',
  // Jeopolitik
  'iran', 'israil', 'orta doğu', 'rusya', 'ukrayna', 'çin', 'tarife',
  'savaş', 'ateşkes', 'yaptırım',
  // Piyasalar
  'borsa', 'bist', 'tahvil', 'cds', 'petrol', 'brent',
];

const RELEVANT_KEYWORDS_EN = [
  'gold', 'silver', 'precious metals', 'bullion', 'ounce',
  'fed', 'fomc', 'inflation', 'cpi', 'ppi', 'rate cut', 'rate hike',
  'dollar', 'dxy', 'treasury', 'yield',
  'iran', 'israel', 'middle east', 'russia', 'ukraine', 'china', 'tariff',
  'oil', 'brent', 'wti',
];

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return [...RELEVANT_KEYWORDS_TR, ...RELEVANT_KEYWORDS_EN]
    .some(kw => lower.includes(kw));
}
```

> ⚠️ Bu liste başlangıç. İlk hafta panelde gereksiz haberler çıkarsa keyword'leri daraltırsın, eksik kalanlar olursa genişletirsin. Adaptive.

#### 4.6 — Frontend: 3 katmanlı haber bölgesi

Burhan OS panelinde tek bir haber akışı vardı (alt taraf). Bizimkinde **3 ayrı kart**:

```
┌────────────────────────────────────────────────────────────┐
│ 07 // 🔴 SON DAKİKA                          BHT · KTC · FRX │
├────────────────────────────────────────────────────────────┤
│ ● BHT 14:32 KARAHAN: FAİZ KORİDORUNDA DEĞİŞİKLİK YOK       │
│ ● KTC 14:31 Gold sheds $47 as rate-hike fears compound...  │
│ ○ FRX 14:28 Brent petrol %1.3 yükseldi, $100.7              │
│ ○ BHT 14:21 TCMB: Rezervler nisanda 165 milyar dolara çıktı│
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 08 // 🟡 PİYASA ANALİZ                    INV · BGP · REU │
├────────────────────────────────────────────────────────────┤
│ INV 13:55  ONS altın 4.700 direncini kırdı, hedef 4.800   │
│ BGP 13:30  Gram altın bayram öncesi rekor: 6.660 TL       │
│ REU 13:12  India tightens gold import after rupee slide    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 09 // 🟢 BÜYÜK RESİM                              AA · WGC │
├────────────────────────────────────────────────────────────┤
│ AA  09:00  Şimşek: 2026 enflasyon hedefi güncellendi      │
│ WGC 08:30  Q1 talep raporu — merkez bankaları 290t aldı   │
└────────────────────────────────────────────────────────────┘
```

**Görsel detaylar:**
- Son dakika kartı: yeni haber gelince **kırmızı flash + ses (opsiyonel)**
- Başlıklar **TÜMÜ BÜYÜK** (Bloomberg HT tarzı), monospace
- İngilizce haberler küçük "EN" rozetiyle, başlık altında Türkçe özet
- Hover/tap: tooltip ile uzun özet açılır
- Kaynak kodu rozetli (BHT, KTC, BGP — 3 harfli)
- Zaman damgası HER haberde, **"şimdi", "5 dk önce"** değil — gerçek saat (`14:32`)

#### Çıktı (Faz 4 sonunda)
- 10+ kaynaktan haber akışı.
- Kategori bazlı 3 farklı kart.
- Keyword filtreyle gürültüsüz.
- AI özet henüz yok — başlıklar olduğu gibi geliyor.

---

### **FAZ 5 — AI: Türkçeleştirme + Kısa Özet + Sentiment** ⏱️ ~5 saat

**Hedef:** TV'deki haberler **tek satırlık temiz Türkçe özet** olarak görünsün. İngilizce Kitco haberi de Türkçe akacak. Her haberin altına yeşil/kırmızı sinyal düşsün.

> Bu fazda Claude API kullanıyoruz. **Anthropic Claude Haiku** modeli — en ucuz, bu görev için fazlasıyla yeter. Aylık tahmini maliyet: **~80-150 TL** (gerçekçi). İstemezsen atla, Faz 4 başlıkları olduğu gibi göstermeye devam eder.

#### 5.0 — Neden gerekli?

Ham RSS başlıkları üç sorunlu:

1. **Çok uzun.** TV'de tek satır 60-80 karakter sığar, ama RSS başlıkları 120+ karakter geliyor.
2. **Karışık dilli.** Kitco İngilizce, Bigpara Türkçe — uniform değil.
3. **Clickbait/uzatma var.** "Gold sheds $47 as rate-hike fears and a thin Trump-Xi statement compound the sell-off" → 90 karakter → TV'de kesilir. **AI özeti: "Ons altın $47 düştü, Fed faiz endişesi"** → 38 karakter, anında okunur.

#### 5.1 — Akış: Her yeni haber → AI pipeline

```
RSS gelir
    ↓
isRelevant() filtre ← keyword kontrolü
    ↓
Supabase'e raw insert (title_original)
    ↓
[Background queue] Claude Haiku API çağrısı
    ↓
JSON döner: {
  title_tr: "...",
  summary_short: "...",
  summary_medium: "...",
  category: "altin",
  sentiment: "negative",
  relevance: 8,
  impact_assets: ["ONS", "GRAM_ALTIN"]
}
    ↓
Supabase update
    ↓
Realtime push → TV ekranı güncellenir
```

#### 5.2 — Tek prompt — her şey aynı çağrıda

Maliyet için her haber için **tek bir Haiku çağrısı** yap, ondan tüm metadatayı çek:

```typescript
const SYSTEM_PROMPT = `Sen bir kuyumcu atölyesi için çalışan altın piyasası haber editörüsün.
Görevin: Verilen ham haber başlığını TV ekranı için optimize etmek.

KURALLAR:
- Türkçe yaz (İngilizce gelirse çevir)
- Tek satır, max 60 karakter (TV'de kesilmesin)
- Yalın, yorum katma, başlık tarzında
- Sayı varsa koru ($47, %2.3 gibi)
- Kuruluş isimlerini kısalt: Federal Reserve → Fed, Türkiye Cumhuriyet Merkez Bankası → TCMB
- Clickbait kelimeleri sil: "İşte!", "Şok!", "Müthiş!", "Son dakika:"

ÇIKTI: SADECE geçerli JSON, başka metin yok.`;

const userPrompt = `HABER:
Başlık: "${news.title_original}"
Kaynak: ${news.source_name}
Tarih: ${news.published_at}

Çıktı formatı:
{
  "title_tr": "Türkçe temiz başlık, max 60 karakter",
  "summary_short": "Aynı başlık ama 40 karakteri geçmesin (TV ticker için)",
  "summary_medium": "1-2 cümle özet, max 200 karakter (tooltip için)",
  "category": "altin | fed | tcmb | dolar | jeopolitik | enflasyon | diger",
  "sentiment": "positive | negative | neutral",
  "relevance": 1-10 (altın fiyatına direkt etki, 10 = çok etkili),
  "impact_assets": ["ONS"|"GRAM_ALTIN"|"USD_TRY"|"EUR_TRY"]
}`;
```

> **sentiment ne demek?** Pozitif = altın yükseltici (Fed faiz indirimi, jeopolitik gerilim). Negatif = altın düşürücü (enflasyon sertleşmesi, faiz artırımı). Neutral = etkisi belirsiz.

#### 5.3 — Maliyet hesabı (gerçekçi)

- Ortalama haber: 80 input token, 150 output token
- Haiku fiyatı (2026 itibariyle): ~$0.25 / 1M input, $1.25 / 1M output
- Tek haber maliyeti: ~$0.0002 = ~0.007 TL
- Günde ~150-200 yeni haber × 30 gün = **~6000 çağrı/ay**
- **Aylık: $1.20 ≈ 45 TL**

Sabah brifingi (bkz 5.5) ekleyince yaklaşık **80-100 TL/ay** toplam. Çok rahat bir bütçe.

> ⚠️ Maliyet kontrolü için **rate limit + cache** koy:
> - Aynı link 24 saat içinde tekrar gelirse skip
> - Günlük max 500 Claude çağrısı sınırı (hata olursa sustur, alarmda söyle)
> - `AI_ENABLED=true` env flag — kapatmak istersen tek satır

#### 5.4 — Hata toleransı

```typescript
try {
  const aiResult = await callClaudeHaiku(news);
  await supabase.update({ ...aiResult });
} catch (err) {
  // AI başarısız oldu — orijinal başlık göster
  await supabase.update({
    title_tr: news.title_original,
    summary_short: truncate(news.title_original, 40),
    sentiment: 'neutral',
    relevance: 5
  });
  // Logla, alarma düşür
}
```

**Frontend her durumda çalışır.** AI yoksa ham başlık görünür.

#### 5.5 — Sabah Brifingi (08:00 cron)

Faz 4'teki 3 kart yetmez — sabah açıldığında **dünden bugüne ne oldu** özeti lazım. Bu daha büyük bir Claude çağrısı, ama günde sadece 1 kez:

```typescript
// /api/cron/digest — schedule: "0 8 * * *"
const last24h = await supabase
  .from('news')
  .select('title_tr, sentiment, relevance, category')
  .gte('published_at', oneDayAgo)
  .gte('relevance', 6)        // sadece önemli olanlar
  .order('relevance', { ascending: false })
  .limit(40);

const briefingPrompt = `Son 24 saatin altın piyasası haberleri (önem sırasına göre):

${last24h.map((n, i) => `${i+1}. [${n.sentiment}] ${n.title_tr}`).join('\n')}

Bu haberlere göre kuyumcu için BRİFİNG yaz. Format:

**DÜN NE OLDU**
[3 madde, her biri 1 cümle, en kritik olanlar]

**BUGÜN DİKKAT**
[2-3 madde, beklenen olaylar/açıklamalar]

**TEK CÜMLELİK YORUM**
[Müşteriye söylenebilecek seviyede, sade]
`;
```

TV'de "06 // BUGÜN'ÜN BRİFİNGİ" kartında 24 saat boyunca durur. Sabah 08:00'de güncellenir. Ayda 30 çağrı × ~500 output token = ~5 TL.

#### 5.6 — Frontend güncellemesi

Faz 4'teki haber kartlarına AI alanları eklenir:

```
┌──────────────────────────────────────────────────────────┐
│ 07 // 🔴 SON DAKİKA                          BHT · KTC · FRX │
├──────────────────────────────────────────────────────────┤
│ ● BHT 14:32 🔴 Karahan: Faiz koridorunda değişiklik yok   │
│ ● KTC 14:31 🟢 Ons altın $47 düştü, Fed endişesi    [EN]  │
│ ○ FRX 14:28 ⚪ Brent petrol %1.3 yükseldi                  │
│ ○ BHT 14:21 🟢 TCMB rezervleri 165 milyar dolara çıktı    │
└──────────────────────────────────────────────────────────┘
```

- 🔴 sentiment "negative" → kırmızı nokta = altın düşürücü haber
- 🟢 sentiment "positive" → yeşil nokta = altın yükseltici  
- ⚪ neutral → gri nokta
- [EN] rozeti orijinal İngilizce olduğunu gösterir
- Hover → `summary_medium` tooltip

#### 5.7 — Çevre koşullarına göre adaptive sentiment vurgusu

Eğer son 1 saatin haberleri ağırlıklı kırmızı (negatif altın) ise üstte küçük gösterge:

```
HABER SENTİMENTİ (son 1 saat): ████░░░░░░ %72 NEGATİF — altın baskı altında
```

Bu basit bir SQL agregasyon, ek Claude çağrısı gerektirmez. Müşteriye "neden altın düşmüş" sorusunun cevabı görsel olarak ortada.

#### Çıktı (Faz 5 sonunda)
- TÜM haberler temiz Türkçe, 40-60 karakter, TV'de pürüzsüz.
- İngilizce haberler otomatik çevrili.
- Her haberin yanında renkli sentiment noktası.
- Sabah 08:00'de günün brifingi otomatik hazır.
- Saatlik sentiment göstergesi.

---

### **FAZ 6 — Hava Durumu + Takvim + Saat** ⏱️ ~2 saat

**Hedef:** Çevresel/zamansal bilgiler.

#### 6.1 — Hava durumu (Open-Meteo, key gerektirmez)

```typescript
const res = await fetch(
  `https://api.open-meteo.com/v1/forecast?` +
  `latitude=39.92&longitude=32.85&` +
  `current=temperature_2m,weather_code&` +
  `daily=temperature_2m_max,temperature_2m_min,weather_code&` +
  `timezone=Europe/Istanbul&forecast_days=3`
);
```

Sağ üst köşede mini kart:
```
ANKARA  22°C  PARÇALI BULUTLU
Yarın: 24°/12°   Pzt: 19°/8°
```

#### 6.2 — Namaz vakitleri (Diyanet/aladhan.com)

```
NAMAZ VAKİTLERİ
İmsak    04:22
Güneş    05:58
Öğle     12:48
İkindi   16:35
Akşam    19:32  ← 23 dk sonra
Yatsı    20:58
```

Yaklaşan vakit highlight, ezana geri sayım.

#### 6.3 — Hicri takvim + Bayram geri sayımı

```
22 NİSAN 2026 ÇARŞAMBA
4 ZİLKADE 1447
RAMAZAN BAYRAMI'NA  82 GÜN
KURBAN BAYRAMI'NA   23 GÜN  ← (en yakın olan vurgulu)
```

Tarih kütüphanesi: `hijri-converter` (npm).

#### Çıktı
- Çevresel bilgi paneli tamam.
- Bayram öncesi talep patlamasını öngörebilirsin.

---

### **FAZ 7 — Alarm/Eşik Sistemi** ⏱️ ~3 saat

**Hedef:** "Gram 6.500'ün altına düşerse haber ver."

#### 7.1 — Supabase tablosu

```sql
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,         -- 'GRAM_ALTIN'
  condition TEXT NOT NULL,      -- 'above', 'below', 'change_pct'
  threshold NUMERIC NOT NULL,
  channel TEXT NOT NULL,        -- 'telegram', 'discord', 'screen'
  channel_target TEXT,          -- bot chat_id veya webhook url
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7.2 — Cron'a alarm check ekle

`/api/cron/prices` sonunda:
```typescript
// Her yeni fiyat sonrası aktif alarmları kontrol et
// Tetiklenirse:
// - Telegram bot API çağır (ücretsiz)
// - VEYA Discord webhook
// - VEYA TV'de büyük popup göster (Supabase Realtime ile)
```

Telegram bot setup ücretsiz: BotFather → token → chat_id.

#### 7.3 — TV'de görsel alarm

Bir alarm tetiklendiğinde ekranın üstünde 10 saniye boyunca büyük şerit:

```
⚠ ALARM  GRAM ALTIN 6.500 TL EŞİĞİNİ KIRDI  (Şu an: 6.487)
```

#### Çıktı
- Telefon ekranı kapalıyken bile fiyat alarmı bildirim olarak düşüyor.
- Dükkanda TV'de görsel alarm.

---

### **FAZ 8 — Tarihsel Veri & Heatmap & Sparkline** ⏱️ ~3 saat

**Hedef:** Biriken veriyi değerlendir.

#### 8.1 — Sparkline'lar (son 24 saat)

Her fiyat kartında küçük çizgi:
```typescript
import { Sparklines, SparklinesLine } from 'react-sparklines';
// Son 144 nokta (her 10 dk = 24 saat)
```

#### 8.2 — Heatmap

11 sarrafiye ürününü 11 mini blok olarak göster, gün içi değişime göre renk:
- +%2 ↑ koyu yeşil
- +%0.5 ↑ açık yeşil
- 0% gri
- -%0.5 ↓ açık kırmızı
- -%2 ↓ koyu kırmızı

#### 8.3 — Tarihte bugün

```
TARİHTE BUGÜN
1 yıl önce:  GRAM 4.890 TL  (+%36,1)
1 ay önce:   GRAM 6.420 TL  (+%3,7)
1 hafta önce:GRAM 6.580 TL  (+%1,2)
```

#### 8.4 — 52 haftalık range

```
GRAM ALTIN 52H
3.890 ━━━━━━━━━━●━━━━━━━━ 7.811
              6.655 (bugün)
```

#### 8.5 — Gün başı / kapanış paneli

```
BUGÜN ÖZET
AÇILIŞ   6.612
ŞİMDİ    6.655  ▲ +0,65%
GÜNLÜK Y 6.670
GÜNLÜK D 6.601
```

#### 8.6 — Cleanup cron

```sql
-- Her gece 03:00, 90 günden eski 1-dakikalık verileri sil,
-- saatlik agregeye aktar. (DB free tier'ı şişirmemek için)
```

#### Çıktı
- Veriler artık görselleşti.
- Geçmişe bakabiliyorsun.

---

### **FAZ 9 — Borsa İstanbul + DXY + Petrol (Ticker)** ⏱️ ~2 saat

**Hedef:** Altını etkileyen makro göstergeler.

#### 9.1 — Üst kayan ticker

Sayfanın en üstünde minimal kayan şerit:

```
BIST 100  11.245 ▲ +0,8%   ·   DXY 104,2 ▼ -0,3%   ·   BRENT $82,4 ▲ +1,1%   ·   BTC $98.420 ▼ -1,2%
```

Veri kaynakları (ücretsiz):
- BIST: investing.com scraping veya YFinance proxy
- DXY: yfinance (`DX-Y.NYB`)
- Brent: yfinance (`BZ=F`)

`yfinance` Node alternatifi: `yahoo-finance2` npm paketi.

#### Çıktı
- Altın hareketlerinin **neden** olduğunu açıklayan göstergeler tek bakışta.

---

### **FAZ 10 — Müşteri Q&A (Opsiyonel)** ⏱️ ~3 saat

> Bu seninle daha önce konuştuğumuzda **istemediğin** özellikti, ama dosyada tutuyorum. İleride fikrin değişirse kolayca aç-kapat.

**Status: DEVRE DIŞI**

---

## 📐 Tasarım Sistemi

### NEGAŞ branding

- **Header'da sol üst:** `NEGAŞ OS // v1.0` — JetBrains Mono Bold, uppercase, tracking-wider
- **Footer'da sağ alt:** Küçük "NEGAŞ" watermark, opacity 0.3
- **Tab title / favicon:** "NEGAŞ" + altın külçe ikonu
- **Logo varsa:** SVG olarak `/public/negas-logo.svg` → header'a sol üste yerleştir, monospace başlığın yanına
- **Logo yoksa:** Sadece tipografik kimlik yeterli, "NEGAŞ" zaten güçlü bir kelime

### Renk paleti (terminal/Bloomberg vibe)

```css
--bg-primary:     #0A0A0A;     /* ana arka plan */
--bg-secondary:   #141414;     /* kart arka plan */
--bg-tertiary:   #1F1F1F;      /* hover/active */
--border:        #2A2A2A;
--text-primary:  #E8E8E8;
--text-secondary:#888888;
--text-muted:    #555555;
--accent-up:     #7FB069;      /* yeşil — yukarı */
--accent-down:   #D17B7B;      /* kırmızı — aşağı */
--accent-warn:   #E0C068;      /* sarı — uyarı/altın vurgusu */
--accent-info:   #6B9FD4;      /* mavi — bilgi */
```

### Tipografi

- **Sayılar, fiyatlar, kodlar:** `JetBrains Mono` (400, 600, 700)
- **Başlıklar (modül numarası):** `JetBrains Mono` uppercase, tracking-wider, opacity 0.6
- **Gerekli yerlerde gövde metin:** `Inter` (haberler için)

### Grid

- 1920x1080 hedef
- 12 kolon grid, 16px gutter
- Margin: 32px her kenar
- Modül numaralandırma: `01 //`, `02 //`, `03 //` (Burhan OS stili)

### Animasyonlar

- Fiyat değişimi: 500ms background flash
- Haber girişi: yumuşak fade + slide
- Loading: pulse (3 noktalı)
- HİÇBİR şey 600ms'den uzun olmasın. Pro his.

---

## 🗂️ Dosya Yapısı

```
src/
├── app/
│   ├── (panel)/
│   │   ├── page.tsx              # ana TV panel
│   │   ├── layout.tsx
│   │   └── _components/
│   │       ├── PriceCard.tsx
│   │       ├── SarrafiyeTable.tsx
│   │       ├── NewsFeed.tsx
│   │       ├── Calculator.tsx
│   │       ├── Weather.tsx
│   │       ├── PrayerTimes.tsx
│   │       ├── HijriCalendar.tsx
│   │       ├── DailyBriefing.tsx
│   │       ├── Sparkline.tsx
│   │       ├── Heatmap.tsx
│   │       ├── AlertBanner.tsx
│   │       └── Ticker.tsx
│   ├── hesapla/
│   │   └── page.tsx              # mobil hesaplayıcı
│   ├── admin/
│   │   └── page.tsx              # ayarlar
│   └── api/
│       ├── cron/
│       │   ├── prices/route.ts
│       │   ├── news/route.ts
│       │   ├── digest/route.ts
│       │   └── cleanup/route.ts
│       └── alerts/
│           └── route.ts
├── lib/
│   ├── supabase.ts
│   ├── anthropic.ts
│   ├── sources/
│   │   ├── haremapi.ts
│   │   ├── altinapi.ts
│   │   ├── tcmb.ts
│   │   ├── openmeteo.ts
│   │   └── rss.ts
│   ├── utils/
│   │   ├── ayar-cevirici.ts
│   │   ├── hicri.ts
│   │   └── format.ts
│   └── types.ts
└── styles/
    └── globals.css
```

---

## 🔐 Güvenlik

- Bütün API key'ler `.env.local`'da, asla commit etme.
- Vercel Cron secret: `CRON_SECRET` env'i.
- Supabase RLS aç: public sadece `latest_prices` view'ini görsün, `INSERT` sadece service role ile.
- `/admin` route'u şifreli (basit middleware yeter).

---

## 🚀 Vercel Deployment Notları

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/prices",  "schedule": "* * * * *" },
    { "path": "/api/cron/news",    "schedule": "*/5 * * * *" },
    { "path": "/api/cron/digest",  "schedule": "0 8 * * *" },
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
  ]
}
```

> Vercel Hobby: max 2 cron job. Üzerine çıkarsan Pro plan ($20/ay) veya GitHub Actions cron kullan.

**Alternatif:** Tek cron job içinde `?task=prices` gibi query param ile multi-task çalıştır. Hobby'de kalmak için bu pratik.

---

## 📋 TV Kurulum (Dükkan — PC + HDMI)

NEGAŞ atölyesinde zaten bilgisayar var, HDMI kablosuyla TV'ye bağlı. En basit senaryo.

### Tek seferlik kurulum

1. **Chrome veya Edge** kullan (Firefox'un kiosk mode'u daha karmaşık).
2. Tarayıcıya `negas-os.vercel.app` (veya custom domain) yaz, başlangıç sayfası yap.
3. **F11** ile tam ekran.
4. Tarayıcının "her zaman aç" / "açılışta başlat" özelliğini aç.

### Windows için: Otomatik tam ekran açılış

`Win + R` → `shell:startup` yaz → açılan klasöre **shortcut** koy:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=https://negas-os.vercel.app
```

`--kiosk` flag'i: F11 bile gerekmez, direkt tam ekran kioskmode açılır, adres çubuğu yok, sekme yok. Müşteri yanlışlıkla başka bir şeye basamaz.

Çıkmak için: `Alt + F4`.

### Mac için (Mac Mini gibi bir cihazsa)

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk --app=https://negas-os.vercel.app
```

System Settings → Login Items'a ekle, açılışta otomatik başlar.

### Önemli sistem ayarları

- **Ekran koruyucu kapalı** (Windows: Settings → Personalization → Lock screen → Screen saver: None)
- **Uyku modu kapalı** (Power & sleep → Never)
- **TV'nin auto-off özelliği kapalı** (TV ayarları → Eco/Energy → Sleep timer: Off)
- **HDMI çözünürlüğü**: TV 1080p ise PC'de de 1920x1080 ayarla, scaling %100. Aksi takdirde sayılar bulanık görünür.

### Bir tıkla restart

Eğer panel donarsa veya güncellersen, masaüstüne bir kısayol ekle:
- Sağ tık → Yeni → Kısayol
- Konum: `chrome.exe --kiosk --app=https://negas-os.vercel.app`
- İsim: "NEGAŞ OS"
- İkon değiştir (NEGAŞ logosu varsa onu kullan, yoksa altın varili / külçe ikonu)

### Yedek senaryo

PC çökerse veya update geldi-restart oldu: telefonunda da `negas-os.vercel.app` açabilirsin. Aynı veriyi gösterir, müşteriye uzatabilirsin. Faz 3'teki `/hesapla` route'u da mobilde tezgah önünde işine yarar.

---

## ✅ Faz Tamamlama Kontrol Listesi

- [ ] **Faz 0** — Boş Next.js Vercel'de
- [ ] **Faz 1** — 4 ana fiyat canlı (gram, ons, USD, EUR)
- [ ] **Faz 2** — Sarrafiye + spread + sparkline
- [ ] **Faz 3** — Hesaplayıcı + işçilik + admin
- [ ] **Faz 4** — Haber RSS akışı
- [ ] **Faz 5** — AI brifing + sentiment (opsiyonel)
- [ ] **Faz 6** — Hava + namaz + hicri + bayram
- [ ] **Faz 7** — Alarm sistemi (Telegram)
- [ ] **Faz 8** — Heatmap + tarihte bugün + 52H + günlük özet
- [ ] **Faz 9** — Üst ticker (BIST, DXY, Brent)
- [ ] **Faz 10** — Müşteri Q&A (DEVRE DIŞI)

---

## 🎯 V1 Kapsamı (MVP)

Eğer bir hafta sonunda canlı bir şey görmek istiyorsan:
**Faz 0 + Faz 1 + Faz 2 + Faz 4** → çalışan bir panel.

Sonraki hafta sonu Faz 3, 6, 7. Bir sonraki ay Faz 5, 8, 9.

---

## 📝 Notlar

- haremapi.tr'nin ücretsiz tier limitlerini commit'ten önce oku, gerekirse her 2 dk'ya çıkar.
- Altın piyasası saat 09:00–18:00 arası en hareketli, gece TR kuyumcu kapalı ama global ons çalışıyor.
- TCMB sadece **resmi yedek** olarak kullan, anlık takip için değil.
- Bayram öncesi haftaları DB'ye etiketle, gelecek yıllar için pattern çıkar.
- Test ortamında **mock data** kullan (env: `USE_MOCK_DATA=true`).
