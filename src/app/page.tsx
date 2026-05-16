export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono p-8">
      <header className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <h1 className="text-sm tracking-wider uppercase opacity-60">
          NEGAŞ OS // v0.1
        </h1>
        <span className="text-xs opacity-40">FAZ 0 — BOOT</span>
      </header>

      <section className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="text-6xl font-bold tracking-tight">NEGAŞ</div>
        <div className="mt-4 text-sm opacity-60">
          operasyon paneli hazırlanıyor
        </div>
        <div className="mt-12 text-xs opacity-40">
          ▁▂▃▄▅▆▇ canlı veri akışı yakında
        </div>
      </section>
    </main>
  );
}
