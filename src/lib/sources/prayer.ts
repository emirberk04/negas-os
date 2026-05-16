// aladhan.com — Konya namaz vakitleri (Diyanet metodu = 13)
// https://aladhan.com/prayer-times-api

export type PrayerSet = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type NextPrayer = {
  name: string;
  time: string; // "HH:MM"
  minutesLeft: number;
};

const NAMES_TR: Record<keyof Omit<PrayerSet, "date">, string> = {
  fajr: "İmsak",
  sunrise: "Güneş",
  dhuhr: "Öğle",
  asr: "İkindi",
  maghrib: "Akşam",
  isha: "Yatsı",
};

const ORDER: (keyof typeof NAMES_TR)[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

function ddmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export async function fetchKonyaPrayerTimes(
  forDate: Date = new Date()
): Promise<PrayerSet | null> {
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity/${ddmmyyyy(forDate)}?city=Konya&country=Turkey&method=13`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const t = json.data?.timings;
    if (!t) return null;
    return {
      date: forDate.toISOString().slice(0, 10),
      fajr: (t.Fajr || "").slice(0, 5),
      sunrise: (t.Sunrise || "").slice(0, 5),
      dhuhr: (t.Dhuhr || "").slice(0, 5),
      asr: (t.Asr || "").slice(0, 5),
      maghrib: (t.Maghrib || "").slice(0, 5),
      isha: (t.Isha || "").slice(0, 5),
    };
  } catch {
    return null;
  }
}

function istNow(): Date {
  const d = new Date();
  return new Date(d.getTime() + d.getTimezoneOffset() * 60_000 + 3 * 3600_000);
}

export function computeNextPrayer(set: PrayerSet): NextPrayer | null {
  const now = istNow();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (const key of ORDER) {
    const t = set[key];
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) continue;
    const [h, m] = t.split(":").map(Number);
    const at = h * 60 + m;
    if (at > nowMin) {
      return {
        name: NAMES_TR[key],
        time: t,
        minutesLeft: at - nowMin,
      };
    }
  }
  // Bugün hiç kalmamış → yarının imsak'ına geri sayım
  return {
    name: `${NAMES_TR.fajr} (Yarın)`,
    time: set.fajr,
    minutesLeft: -1,
  };
}
