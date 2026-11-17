import { MiniIcon, type MiniIconName } from "./MiniIcon";

/**
 * Cartão de resumo com ícone, valor e detalhe.
 * Aparece no topo das telas Estoque, Desperdícios, Prioridades e Relatórios.
 * "tone" escolhe a cor do quadradinho do ícone (verde, amarelo ou vermelho).
 * tone = "brand" é o valor padrão, usado quando a prop não é passada.
 */
export function Summary({ label, value, detail, icon, tone = "brand" }: { label: string; value: string; detail: string; icon: MiniIconName; tone?: "brand" | "warning" | "danger" }) {
  const colors = tone === "danger" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--brand-soft)] text-[var(--brand)]";
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
      <div className={`grid size-10 place-items-center rounded-xl ${colors}`}><MiniIcon name={icon} /></div>
      <p className="mt-4 text-sm text-[var(--muted-strong)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-medium text-[var(--muted)]">{detail}</p>
    </div>
  );
}
