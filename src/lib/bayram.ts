// Bayram geri sayımı — Diyanet resmi tarihleri (hardcoded, hicri hesabı kaçınmak için)
// Kaynak: https://www.diyanet.gov.tr/

type Bayram = {
  type: "Ramazan" | "Kurban";
  startDate: string; // ISO YYYY-MM-DD (Türkiye)
};

const BAYRAMS: Bayram[] = [
  { type: "Ramazan", startDate: "2026-03-19" },
  { type: "Kurban", startDate: "2026-05-26" },
  { type: "Ramazan", startDate: "2027-03-09" },
  { type: "Kurban", startDate: "2027-05-16" },
  { type: "Ramazan", startDate: "2028-02-26" },
  { type: "Kurban", startDate: "2028-05-04" },
  { type: "Ramazan", startDate: "2029-02-14" },
  { type: "Kurban", startDate: "2029-04-24" },
];

export type BayramCountdown = {
  next: { type: string; date: string; daysLeft: number };
  ramazan: { date: string; daysLeft: number } | null;
  kurban: { date: string; daysLeft: number } | null;
};

function daysBetween(from: Date, toISO: string): number {
  const to = new Date(toISO + "T00:00:00+03:00");
  const diff = to.getTime() - from.getTime();
  return Math.ceil(diff / (24 * 3600_000));
}

export function getBayramCountdown(now: Date = new Date()): BayramCountdown {
  // Bugüne göre kalan bayramları al
  const upcoming = BAYRAMS.filter((b) => daysBetween(now, b.startDate) >= 0);

  const ramazan = upcoming.find((b) => b.type === "Ramazan");
  const kurban = upcoming.find((b) => b.type === "Kurban");

  // En yakını
  const sorted = [...upcoming].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
  const next = sorted[0] || BAYRAMS[0];

  return {
    next: {
      type: next.type,
      date: next.startDate,
      daysLeft: daysBetween(now, next.startDate),
    },
    ramazan: ramazan
      ? { date: ramazan.startDate, daysLeft: daysBetween(now, ramazan.startDate) }
      : null,
    kurban: kurban
      ? { date: kurban.startDate, daysLeft: daysBetween(now, kurban.startDate) }
      : null,
  };
}
