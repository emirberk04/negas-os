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

### **FAZ 4 — Haber Akışı (RSS)** ⏱️ ~3 saat

**Hedef:** Altın/ekonomi haberleri canlı kayıyor.

#### 4.1 — Supabase tablosu

```sql
CREATE TABLE news (
  id BIGSERIAL PRIMARY KEY,
  source TEXT,           -- 'SBH', 'SZC', 'INV', 'BHT'
  title TEXT NOT NULL,
  link TEXT UNIQUE,      -- duplicate engelleme
  published_at TIMESTAMPTZ,
  category TEXT,         -- 'altin', 'ekonomi', 'global'
  sentiment TEXT,        -- Faz 5'te dolacak: 'positive', 'negative', 'neutral'
  relevance INT,         -- 1-10, AI etiketi
  summary TEXT,          -- AI özet
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2 — Cron: `/api/cron/news` (her 5 dk)

RSS kaynakları:
- `https://www.sabah.com.tr/rss/finansaltin-haberleri.xml` (en kritik, altın özel)
- `https://www.sozcu.com.tr/feeds-rss-category-ekonomi`
- `https://tr.investing.com/rss/news_25.rss` (emtia)
- Bloomberg HT RSS
- Kitco News RSS (dünya altın haberleri, İngilizce)

```typescript
import Parser from 'rss-parser';

const SOURCES = [
  { code: 'SBH', url: 'https://www.sabah.com.tr/rss/finansaltin-haberleri.xml' },
  // ...
];

// Her kaynağı sırayla çek, link unique ise insert.
```

#### 4.3 — Frontend: Haber akışı

TV layout'unda alt bölge:

```
07 // HABER AKIŞI                          SBH · SZC · INV
─────────────────────────────────────────────────────────
SBH  14:32  Gram altın yeni rekor: 6.660 TL          ALT
SZC  14:18  Fed faiz kararı öncesi piyasalar...      EKO
INV  13:55  ONS altın 4.700 direncini kırdı          GLB
BHT  13:40  TCMB rezervleri açıkladı                 EKO
SBH  12:21  Çeyrek altın bayram öncesi hareketleniyor ALT
─────────────────────────────────────────────────────────
```

Her 30 saniyede otomatik scroll, en yeni en üstte.

#### Çıktı
- 5 kaynaktan canlı haber akışı.
- Veriler Supabase'de saklanıyor.

---

### **FAZ 5 — AI: Sabah Brifingi + Sinyal Etiketleri** ⏱️ ~4 saat

**Hedef:** Claude API ile haberleri zekileştir.

> Bu faz Claude API kullanıyor. Aylık tahmini maliyet: ~50-150 TL. İstemezsen atla.

#### 5.1 — Cron: `/api/cron/digest` (sabah 08:00)

```typescript
// Son 24 saatin haberlerini çek
// Claude'a yedir:
const prompt = `
Bugün altın piyasasını etkileyebilecek son 24 saatin haberleri:

${newsItems.map(n => `- [${n.source}] ${n.title}`).join('\n')}

Son 24 saatte gram altın: ${priceChange}
Ons altın: ${onsChange}
USD/TRY: ${usdChange}

Aşağıdaki yapıda Türkçe bir kuyumcu sabah brifingi yaz:

**DÜN NE OLDU**
[2-3 cümle, ana hareketler]

**BUGÜN DİKKAT**
[2-3 cümle, beklenen olaylar]

**KISA YORUM**
[1 cümle, sade dil, müşteriye anlatılabilecek seviyede]
`;
```

Sonucu `daily_briefings` tablosuna yaz, TV'de "08 // BUGÜN'ÜN BRİFİNGİ" kartında göster.

#### 5.2 — Haber sentiment etiketleme

Her yeni haber geldiğinde (Faz 4'teki cron'a ekle):

```typescript
// Batch halinde, her 5 dk'da yeni haberleri Claude'a yedir
const prompt = `Aşağıdaki haberin altın fiyatına etkisini değerlendir:
Başlık: "${title}"
Cevap formatı: JSON
{
  "sentiment": "positive|negative|neutral",
  "relevance": 1-10,
  "summary": "tek cümle Türkçe özet"
}`;
```

Frontend'te haber satırının yanında renkli nokta:
- 🟢 positive (altın yükseltici)
- 🔴 negative (altın düşürücü)
- ⚪ neutral

#### 5.3 — Maliyet kontrolü

- Günlük brifing: 1 çağrı × 30 gün ≈ 30 çağrı/ay
- Haber etiketi: ~50 haber/gün × 30 ≈ 1500 çağrı/ay
- Claude Haiku kullan (en ucuz model, bu görev için yeter)
- Tahmini: **~3-5$/ay**

#### Çıktı
- Sabah TV'de günün brifingi görünüyor.
- Her haber renkli sentiment etiketli.

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
