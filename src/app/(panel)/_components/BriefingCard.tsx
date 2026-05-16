import { Panel } from "./Panel";

export function BriefingCard() {
  return (
    <Panel number="09" title="GÜN BRİFİNGİ" meta="FAZ 5 · CLAUDE">
      <div className="space-y-3 text-[11px]">
        <div className="border-l-2 border-[var(--accent-blue)] bg-[var(--bg-elevated)] py-2 pl-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            BUGÜN · 08:00
          </div>
          <div className="mt-1 text-[var(--text)]">
            Sabah brifingi henüz oluşturulmadı.
          </div>
        </div>
        <div className="space-y-2 leading-relaxed text-[var(--text-muted)]">
          <p>
            Her sabah 08:00&apos;de Claude API son 24 saatin haberlerini ve
            fiyat hareketlerini özetleyecek.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            DÜN NE OLDU · BUGÜN DİKKAT · KISA YORUM
          </p>
        </div>
        <div className="border-t border-[var(--border-soft)] pt-2 text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
          Aylık tahmini maliyet ~3-5 USD · Haiku
        </div>
      </div>
    </Panel>
  );
}
