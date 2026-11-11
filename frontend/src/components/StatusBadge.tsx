/** Rótulo colorido do estado de validade de um lote. */
export function StatusBadge({ status }: { status: string }) {
  const color = status === "Vencido" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : status === "Atenção" || status === "Sem validade" ? "bg-[var(--warning-soft)] text-[var(--warning-ink)]" : "bg-[var(--brand-soft)] text-[var(--brand-dark)]";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}
