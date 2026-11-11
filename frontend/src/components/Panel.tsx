import type { ReactNode } from "react";

/** Contêiner visual reutilizado nos resumos laterais do painel. */
export function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">{children}</div>;
}
