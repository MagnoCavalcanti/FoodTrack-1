import { useState } from "react";
import { formatQuantity, localDateOffset } from "../api";
import type { PageProps } from "./types";
import { PageHeader, SecondaryButton, Summary } from "./ui";

export default function PriorityPage({ navigate, openWaste, foods, stocks }: PageProps) {
  const [filter, setFilter] = useState("Todos");
  // Combina estoques e alimentos pelos IDs e classifica a validade no navegador.
  const priorities = stocks.filter((stock) => stock.validade && stock.validade <= localDateOffset(3)).map((stock) => {
    const food = foods.find((item) => item.id === stock.alimento);
    if (!food) return null;
    const days = Math.ceil((new Date(`${stock.validade}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
    return {
      id: stock.id,
      name: food.nome,
      category: food.categoria,
      amount: `${formatQuantity(stock.quantidade_atual)} ${food.medida}`,
      expiry: days < 0 ? "Vencido" : days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)`,
      critical: days <= 1,
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visible = priorities.filter((item) => filter === "Todos" || (filter === "Até amanhã" ? item.critical : item.category === filter));
  return (
    <>
      <PageHeader eyebrow="Ação preventiva" title="Itens Prioritários" description="Alimentos que devem ser utilizados primeiro para evitar vencimentos e reduzir perdas." actions={<SecondaryButton onClick={() => navigate("Dashboard")}>Voltar ao dashboard</SecondaryButton>} />
      {/* Estes resumos são valores demonstrativos, não calculados dos dados da API. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Exigem atenção" value="8 itens" detail="Vencem nos próximos 3 dias" icon="calendar" tone="warning" />
        <Summary label="Vencem hoje" value="2 itens" detail="Ação imediata recomendada" icon="trash" tone="danger" />
        <Summary label="Perda em risco" value="R$ 1.150" detail="Valor que ainda pode ser preservado" icon="chart" tone="warning" />
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-bold">Ordem recomendada de uso</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">A lista está organizada pela validade mais próxima.</p></div>
          <div className="flex gap-2 overflow-x-auto">{["Todos", "Até amanhã", ...new Set(priorities.map((item) => item.category))].map((item) => <button key={item} onClick={() => setFilter(item)} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${filter === item ? "bg-[var(--ink)] text-white" : "bg-[var(--surface-soft)] text-[var(--muted-strong)]"}`}>{item}</button>)}</div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {visible.map((item, index) => {
            return <article key={item.id} className="grid gap-4 p-5 transition sm:p-6 lg:grid-cols-[44px_minmax(0,1fr)_auto] lg:items-center">
              <span className={`grid size-10 place-items-center rounded-full text-sm font-bold ${item.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>{index + 1}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"}`}>{item.expiry}</span></div>
                <p className="mt-1.5 text-sm text-[var(--muted-strong)]">{item.category} · {item.amount}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button onClick={() => openWaste(item.id)} className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--muted-strong)]">Registrar baixa</button>
              </div>
            </article>;
          })}
        </div>
      </section>
    </>
  );
}
