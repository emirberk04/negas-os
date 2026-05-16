import { Panel } from "./Panel";

export function AlertsCard() {
  return (
    <Panel number="06" title="ALARM KUTUSU" meta="0 AKTİF">
      <div className="space-y-3 text-[11px]">
        <div className="border-l-2 border-[var(--accent-warn)] bg-[var(--bg-elevated)] py-2 pl-3">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>SİSTEM</span>
            <span>FAZ 7</span>
          </div>
          <div className="mt-1 text-[var(--text)]">
            Alarm/eşik sistemi henüz aktif değil.
          </div>
          <div className="mt-1 leading-relaxed text-[var(--text-muted)]">
            Gram, ons veya kur belirli bir eşiği aştığında Telegram/ekran
            bildirimi gönderecek. Faz 7&apos;de devreye girecek.
          </div>
        </div>
        <div className="border-l-2 border-[var(--accent-blue)] bg-[var(--bg-elevated)] py-2 pl-3">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>ÖNERİ</span>
            <span>—</span>
          </div>
          <div className="mt-1 text-[var(--text)]">
            Örnek tanım: <span className="font-mono">GRAM &lt; 6.500</span>
          </div>
          <div className="mt-1 leading-relaxed text-[var(--text-muted)]">
            Eşik kırılınca anında bildirim al.
          </div>
        </div>
      </div>
    </Panel>
  );
}
