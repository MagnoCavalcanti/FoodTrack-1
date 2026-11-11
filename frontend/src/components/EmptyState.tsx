import { MiniIcon } from "./MiniIcon";

/** Mensagem exibida quando uma lista filtrada não tem resultados. */
export function EmptyState({ title, description, action, actionLabel }: { title: string; description: string; action: () => void; actionLabel: string }) {
  return <div className="p-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--muted)]"><MiniIcon name="search" /></span><p className="mt-4 font-bold">{title}</p><p className="mt-1 text-sm text-[var(--muted)]">{description}</p><button onClick={action} className="mt-4 min-h-10 font-bold text-[var(--brand-dark)]">{actionLabel}</button></div>;
}
