import type { ReactNode } from "react";

/**
 * Rótulo de formulário com o campo passado como conteúdo.
 * Uso: <Field label="Nome" required><input ... /></Field>
 * Como o input fica DENTRO do <label>, clicar no texto já foca o campo.
 * Com required, aparece um asterisco vermelho.
 */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label>
      {/* "field-label" é uma classe definida no index.css */}
      <span className="field-label">{label}{required && <span className="text-[var(--danger)]"> *</span>}</span>
      {children}
    </label>
  );
}
