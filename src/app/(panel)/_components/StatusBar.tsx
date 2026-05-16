"use client";

import { useEffect, useState } from "react";

export function StatusBar() {
  const [now, setNow] = useState<string>("--:--:--");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Europe/Istanbul",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-[#2A2A2A] px-8 py-4 font-mono">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-bold tracking-wider uppercase">
          NEGAŞ OS
        </span>
        <span className="text-xs opacity-40">// v0.1</span>
      </div>
      <div className="flex items-center gap-6 text-xs uppercase tracking-wider opacity-70">
        <span>{now} IST</span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#7FB069]" />
          LIVE
        </span>
      </div>
    </header>
  );
}
