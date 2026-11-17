import type { ReactNode } from "react";

/**
 * Título de página com a linha de contexto e as ações à direita.
 * Usado no topo de todas as telas. Exemplo:
 *   eyebrow = "Controle de perdas"   (texto pequeno verde acima do título)
 *   title   = "Desperdícios"
 *   actions = <Button>Registrar desperdício</Button>   (opcional)
 */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    // No celular fica em coluna; em telas grandes (lg) o texto vai à esquerda e as ações à direita.
    <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.09em] text-[var(--brand)]">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-[var(--muted-strong)] sm:text-base">{description}</p>
      </div>
      {/* "a && b": só desenha os botões se a prop actions foi passada. */}
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
