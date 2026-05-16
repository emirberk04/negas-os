import { Panel } from "./Panel";

export function AtolyeCard() {
  return (
    <Panel number="01" title="ATÖLYE" meta="AÇIK">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center border border-[var(--border)] bg-[var(--bg-elevated)] text-xl font-bold text-[var(--accent-gold)]">
          ★
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-[var(--text)]">
            NEGAŞ <span className="font-normal italic text-[var(--text-muted)]">Kuyumcu</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Kuyumcular · Konya
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border-soft)] pt-3 text-[10px] uppercase tracking-wider">
        <div>
          <div className="text-[var(--text-muted)]">FOKUS</div>
          <div className="text-[var(--text)]">SARRAFİYE</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">DURUM</div>
          <div className="text-[var(--accent-up)]">TEZGAH</div>
        </div>
      </div>
    </Panel>
  );
}
