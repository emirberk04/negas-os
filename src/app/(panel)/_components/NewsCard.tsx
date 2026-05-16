import { Panel } from "./Panel";

const SAMPLE = [
  { code: "SBH", time: "—", title: "Sabah · Finans/Altın", tag: "ALT" },
  { code: "SZC", time: "—", title: "Sözcü · Ekonomi", tag: "EKO" },
  { code: "INV", time: "—", title: "Investing TR · Emtia", tag: "GLB" },
  { code: "BHT", time: "—", title: "Bloomberg HT", tag: "EKO" },
  { code: "KTC", time: "—", title: "Kitco News (global ons)", tag: "GLB" },
];

export function NewsCard() {
  return (
    <Panel
      number="08"
      title="HABER AKIŞI"
      meta="FAZ 4 · BEKLEMEDE"
    >
      <div className="mb-3 rounded-none border-l-2 border-[var(--accent-warn)] bg-[var(--bg-elevated)] py-2 pl-3 text-[11px]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Henüz aktif değil
        </div>
        <div className="mt-1 text-[var(--text)]">
          5 kaynak RSS akışı Faz 4&apos;te bağlanacak. Her haber AI ile
          sentiment etiketlenecek (yeşil / kırmızı nokta).
        </div>
      </div>
      <ul className="space-y-1.5 text-[11px]">
        {SAMPLE.map((n) => (
          <li
            key={n.code}
            className="grid grid-cols-[40px_50px_1fr_40px] items-center gap-2 border-b border-[var(--border-soft)] pb-1.5 last:border-b-0"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {n.code}
            </span>
            <span className="font-mono text-[10px] text-[var(--text-faint)]">
              {n.time}
            </span>
            <span className="truncate text-[var(--text-muted)] opacity-70">
              {n.title}
            </span>
            <span className="text-right font-mono text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
              {n.tag}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
