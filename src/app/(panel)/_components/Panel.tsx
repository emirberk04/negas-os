import type { ReactNode } from "react";

type Props = {
  number: string;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ number, title, meta, children, className = "" }: Props) {
  return (
    <section
      className={`flex h-full flex-col border border-[var(--border)] bg-[var(--bg-panel)] ${className}`}
    >
      <header className="flex items-baseline justify-between border-b border-[var(--border-soft)] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
        <span>
          <span className="opacity-70">{number} //</span>{" "}
          <span className="font-semibold text-[var(--text)] opacity-90">
            {title}
          </span>
        </span>
        {meta && <span className="opacity-70">{meta}</span>}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
