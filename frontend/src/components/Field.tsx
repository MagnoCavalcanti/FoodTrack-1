import type { ReactNode } from "react";

/** Rótulo de formulário com o campo passado como conteúdo. */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label><span className="field-label">{label}{required && <span className="text-[var(--danger)]"> *</span>}</span>{children}</label>;
}
