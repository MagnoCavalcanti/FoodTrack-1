import { MiniIcon } from "./MiniIcon";
import { Button } from "./Button";

/**
 * Mensagem exibida quando uma lista filtrada não tem resultados.
 * Ex.: no Estoque, quando a busca não encontra nada, mostra o aviso e um
 * botão para limpar os filtros (action).
 */
export function EmptyState({ title, description, action, actionLabel }: { title: string; description: string; action: () => void; actionLabel: string }) {
  return (
    <div className="p-12 text-center">
      {/* Círculo cinza com a lupa */}
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--muted)]"><MiniIcon name="search" /></span>
      <p className="mt-4 font-bold">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      {/* Ação sugerida, ex.: "Limpar filtros" */}
      <Button variant="ghost" size="sm" onClick={action} className="mt-4">{actionLabel}</Button>
    </div>
  );
}
