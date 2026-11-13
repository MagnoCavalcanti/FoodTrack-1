import { Icon } from "./Icon";
import { Panel } from "./Panel";
import { StatCard } from "./StatCard";
import type { ExpiringFood } from "./types";
import { Button } from "./Button";

type DashboardPageProps = {
  foodsExpiringToday: ExpiringFood[];
  prazoAlerta: string;
  expiringSoonCount: number;
  expiredCount: number;
  wasteThisMonth: number;
  foodCount: number;
  stockCount: number;
  stocksWithoutValidity: number;
  categoryCount: number;
  navigate: (page: string) => void;
  onRegisterWaste: (stockId: number) => void;
};

// Apresenta indicadores e alertas preparados pelo componente App.
export default function DashboardPage({
  foodsExpiringToday,
  prazoAlerta,
  expiringSoonCount,
  expiredCount,
  wasteThisMonth,
  foodCount,
  stockCount,
  stocksWithoutValidity,
  categoryCount,
  navigate,
  onRegisterWaste,
}: DashboardPageProps) {
  return (
    <>
      <section>
        <div>
          <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]"><span className="size-2 rounded-full bg-[var(--success)]" /> Estoque do restaurante <span className="text-[var(--line-strong)]">•</span><span className="text-[var(--muted-strong)]">{new Date().toLocaleDateString("pt-BR")}</span></p>
          <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-[2rem]">Painel Operacional da Cozinha</h1>
        </div>
      </section>

      {expiringSoonCount > 0 && <section className="mt-7 flex flex-col gap-4 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm lg:flex-row lg:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--warning-border)] bg-white/50 text-[var(--warning)]"><Icon name="alert" size={20} /></span>
        <p className="flex-1 leading-relaxed text-[var(--warning-ink)]"><strong>Atenção: {expiringSoonCount} estoques vencem {prazoAlerta}.</strong> Consulte a validade e priorize esses itens.</p>
        <Button variant="warning" onClick={() => navigate("Prioridades")} trailing={<Icon name="chevron" size={16} />}>Ver itens prioritários</Button>
      </section>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alimentos cadastrados" value={String(foodCount)} suffix="itens" icon="box" footer={`${stockCount} registros no estoque`} />
        <StatCard label="Dentro do prazo de alerta" value={String(expiringSoonCount)} suffix="registros de estoque" badge={expiringSoonCount ? "Atenção" : undefined} warning={expiringSoonCount > 0} footer={`Classificados pelo servidor ${prazoAlerta}`} />
        <StatCard label="Validades vencidas" value={String(expiredCount)} suffix="registros de estoque" badge={expiredCount ? "Verificar" : undefined} danger={expiredCount > 0} footer="Lotes com quantidade ainda disponível" />
        <StatCard label="Desperdícios no mês" value={String(wasteThisMonth)} suffix="registros" icon="trash" footer="Total do relatório mensal" />
      </section>

      <section className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(310px,0.96fr)]">
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
          <div className="flex flex-col gap-5 border-b border-[var(--line)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold leading-tight">Estoques com validade próxima</h2>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">{foodsExpiringToday.length} lotes vencidos ou dentro do prazo de alerta.</p>
            </div>
            <span className="w-fit rounded-full bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-bold text-[var(--danger)]">Ação imediata</span>
          </div>
          <div>
            {foodsExpiringToday.map((food) => (
              <article key={food.id} className="grid gap-4 border-b border-[var(--line)] p-5 last:border-b-0 sm:grid-cols-[60px_minmax(0,1fr)] lg:grid-cols-[60px_minmax(0,1fr)_165px] lg:items-center">
                <div className={`grid h-[60px] place-items-center rounded-xl border text-xs font-bold ${food.categoryClass}`}>{food.category}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{food.name}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${food.critical ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]" : "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"}`}>{food.critical && "• "}{food.expiry}</span>
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--muted-strong)]"><span>{food.location}</span><span className="text-[var(--line-strong)]">•</span><span>{food.amount}</span></p>
                </div>
                <div className="flex flex-row items-center gap-3 sm:col-start-2 lg:col-start-auto lg:flex-col lg:items-stretch">
                  <Button variant="dangerSoft" onClick={() => onRegisterWaste(food.id)} className="flex-1">Registrar baixa</Button>
                </div>
              </article>
            ))}
            {foodsExpiringToday.length === 0 && <div className="p-12 text-center"><p className="font-semibold">Nenhum lote dentro do prazo de alerta</p><p className="mt-1 text-sm text-[var(--muted)]">A busca também pode estar ocultando os itens retornados.</p></div>}
          </div>
          <div className="flex flex-col gap-3 bg-[var(--surface-soft)] px-5 py-4 text-sm text-[var(--muted-strong)] sm:flex-row sm:items-center sm:justify-between">
            <span>Lista vinda dos próximos vencimentos, já ordenada pela validade.</span>
            <Button variant="ghost" size="sm" onClick={() => navigate("Prioridades")} trailing={<Icon name="chevron" size={16} />}>Ver próximas validades</Button>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel>
            <div className="flex items-center justify-between"><h2 className="panel-title">Resumo do Estoque</h2><strong className="text-sm">{stockCount} registros</strong></div>
            <p className="mt-4 text-sm text-[var(--muted-strong)]">{foodCount} alimentos em {categoryCount} categorias.</p>
            <p className="mt-3 text-sm text-[var(--muted-strong)]">{stocksWithoutValidity} registros sem validade informada.</p>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between"><h2 className="panel-title">Desperdícios</h2><span className="text-xs text-[var(--muted)]">Este mês</span></div>
            <p className="mt-5 text-3xl font-bold">{wasteThisMonth}</p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">registros; a baixa desconta o lote e o custo não é oferecido pela API.</p>
          </Panel>
        </aside>
      </section>
    </>
  );
}
