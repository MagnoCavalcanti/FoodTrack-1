import type { ReactNode } from "react";

/**
 * Contêiner visual reutilizado nos resumos laterais do painel.
 * É só uma "caixa branca com borda e sombra" em volta do conteúdo (children).
 */
export function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">{children}</div>;
}
