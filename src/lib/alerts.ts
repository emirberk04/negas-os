import type { SupabaseClient } from "@supabase/supabase-js";

type AlertRow = {
  id: number;
  symbol: string;
  condition: "above" | "below";
  threshold: number;
  label: string | null;
  enabled: boolean;
  cooldown_minutes: number | null;
  last_triggered_at: string | null;
};

type PriceTick = { symbol: string; bid: number; ask: number };

/**
 * Yeni fiyat batch'i geldikten sonra aktif alarmları kontrol et,
 * tetiklenenleri alert_events tablosuna yaz, last_triggered_at güncelle.
 *
 * Cooldown: aynı alarm peş peşe defalarca tetiklenmesin (varsayılan 30 dk).
 */
export async function checkAlerts(
  sb: SupabaseClient,
  prices: PriceTick[]
): Promise<{ checked: number; triggered: number }> {
  const { data: alerts, error } = await sb
    .from("alerts")
    .select(
      "id, symbol, condition, threshold, label, enabled, cooldown_minutes, last_triggered_at"
    )
    .eq("enabled", true);

  if (error || !alerts) return { checked: 0, triggered: 0 };

  const byPrice = new Map<string, PriceTick>();
  for (const p of prices) byPrice.set(p.symbol, p);

  const now = Date.now();
  const events: Record<string, unknown>[] = [];
  const updates: { id: number; ts: string }[] = [];

  for (const a of alerts as AlertRow[]) {
    const tick = byPrice.get(a.symbol);
    if (!tick) continue;

    const value = tick.ask;
    const fires =
      (a.condition === "above" && value >= Number(a.threshold)) ||
      (a.condition === "below" && value <= Number(a.threshold));
    if (!fires) continue;

    // Cooldown kontrolü
    if (a.last_triggered_at) {
      const lastMs = new Date(a.last_triggered_at).getTime();
      const cooldownMs = (a.cooldown_minutes ?? 30) * 60_000;
      if (now - lastMs < cooldownMs) continue;
    }

    const arrow = a.condition === "above" ? "↑" : "↓";
    const message =
      a.label ||
      `${a.symbol} ${arrow} ${Number(a.threshold).toLocaleString("tr-TR")} eşiği kırıldı (şu an ${value.toLocaleString("tr-TR")})`;

    events.push({
      alert_id: a.id,
      symbol: a.symbol,
      condition: a.condition,
      threshold: a.threshold,
      value,
      message,
    });
    updates.push({ id: a.id, ts: new Date(now).toISOString() });
  }

  if (events.length === 0) {
    return { checked: alerts.length, triggered: 0 };
  }

  await sb.from("alert_events").insert(events);
  // last_triggered_at toplu update — tek tek (Supabase bulk update yok)
  await Promise.all(
    updates.map((u) =>
      sb.from("alerts").update({ last_triggered_at: u.ts }).eq("id", u.id)
    )
  );

  return { checked: alerts.length, triggered: events.length };
}
