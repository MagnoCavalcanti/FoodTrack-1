import { localDateOffset, localDateString } from "../api";
import type { PageProps } from "./types";
import { PageHeader, Rank, SecondaryButton, Summary, downloadFile } from "./ui";

export default function ReportsPage({ foods, stocks, waste }: PageProps) {
  const now = new Date();
  // Os indicadores desta tela são derivados dos recursos carregados no frontend.
  const soon = stocks.filter((stock) => stock.validade && stock.validade >= localDateString(now) && stock.validade <= localDateOffset(3)).length;
  const monthWaste = waste.filter((record) => record.data.startsWith(localDateString(now).slice(0, 7)));
  const categoryCounts = foods.reduce<Record<string, number>>((totals, food) => {
    totals[food.categoria] = (totals[food.categoria] || 0) + 1;
    return totals;
  }, {});
  const categories = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]);
  const maxCategoryCount = Math.max(1, ...categories.map(([, count]) => count));
  const recentWeeks = Array.from({ length: 4 }, (_, index) => {
    // Conta registros, sem somar quantidades que podem usar unidades diferentes.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (3 - index) * 7 - 6);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (3 - index) * 7 + 1);
    const count = waste.filter((record) => {
      const date = new Date(`${record.data}T00:00:00`);
      return date >= start && date < end;
    }).length;
    return { label: `Semana ${index + 1}`, count };
  });
  const maxWeekCount = Math.max(1, ...recentWeeks.map((week) => week.count));
  return (
    <>
      <PageHeader eyebrow="Resultados da operação" title="Relatórios" description="Indicadores calculados a partir de estoques, alimentos e desperdícios retornados pela API." actions={<SecondaryButton onClick={() => downloadFile("relatorio-foodtrack.csv", ["Tipo,ID,Data,Quantidade,Descricao", ...waste.map((record) => `Desperdício,${record.id},${record.data},${record.quantidade},"${record.descricao.replace(/"/g, '""')}"`)].join("\n"), "text/csv")} icon="download">Exportar desperdícios</SecondaryButton>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Alimentos cadastrados" value={String(foods.length)} detail="Registros no restaurante" icon="box" />
        <Summary label="Estoques próximos da validade" value={String(soon)} detail="Até 3 dias" icon="calendar" tone="warning" />
        <Summary label="Desperdícios este mês" value={String(monthWaste.length)} detail="Registros da API" icon="trash" />
        <Summary label="Estoques sem validade" value={String(stocks.filter((stock) => !stock.validade).length)} detail="Sem data cadastrada" icon="filter" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-bold">Registros de desperdício por semana</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Contagem das últimas quatro semanas; volumes entre unidades diferentes não são somados.</p>
          <div className="mt-7 grid h-64 grid-cols-4 items-end gap-3 border-b border-[var(--line)] px-2 sm:gap-6">{recentWeeks.map((week) => <div key={week.label} className="flex h-full flex-col items-center justify-end"><strong className="mb-2 text-xs">{week.count}</strong><div className="w-full max-w-14 rounded-t-lg bg-[var(--brand)]" style={{ height: `${Math.max(4, week.count / maxWeekCount * 78)}%` }} /></div>)}</div>
          <div className="grid grid-cols-4 gap-3 px-2 pt-3 text-center text-xs text-[var(--muted)]">{recentWeeks.map((week) => <span key={week.label}>{week.label}</span>)}</div>
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-bold">Alimentos por categoria</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Contagem dos alimentos cadastrados.</p>
          <div className="mt-7 space-y-5">{categories.map(([name, count]) => <Rank key={name} label={name} value={String(count)} percent={`${count / maxCategoryCount * 100}%`} />)}</div>
          {categories.length === 0 && <p className="mt-5 text-sm text-[var(--muted-strong)]">Não há alimentos cadastrados.</p>}
        </section>
      </div>
      <p className="mt-6 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)]">A API não fornece custos, metas, economia, métricas de compra ou conversão de unidades; esses indicadores não são calculados aqui.</p>
    </>
  );
}
