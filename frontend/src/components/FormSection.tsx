import type { ReactNode } from "react";

/** Bloco de formulário com título, descrição e grade de campos. */
export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-7"><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">{description}</p><div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div></section>;
}
