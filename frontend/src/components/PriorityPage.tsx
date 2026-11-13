import { useState } from "react";
import { formatQuantity } from "../api/formatacao";
import type { PageProps } from "./types";
import { PageHeader } from "./PageHeader";
import { Summary } from "./Summary";
import { Button } from "./Button";

export default function PriorityPage({ navigate, openWaste, expiringStocks, usageOrder, prazoAlerta }: PageProps) {
  const [filter, setFilter] = useState("Todos");
  const alertaPorEstoque = new Map(expiringStocks.map((stock) => [stock.id, stock]));
  const atencao = expiringStocks.filter((stock) => stock.situacao !== "vencido").length;
  const vencemHoje = expiringStocks.filter((stock) => stock.situacao === "hoje").length;
  const vencidos = expiringStocks.filter((stock) => stock.situacao === "vencido").length;
  // A ordem e os nomes já vêm de /api/estoques/ordem-utilizacao/.
  const priorities = usageOrder.map((stock) => {
    const alerta = alertaPorEstoque.get(stock.id);
    const days = alerta ? alerta.dias_restantes : stock.validade
      ? Math.ceil((new Date(`${stock.validade}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
      : null;
    return {
      id: stock.id,
      posicao: stock.posicao,
      name: stock.alimento_nome,
      category: stock.categoria,
      amount: `${formatQuantity(stock.quantidade_atual)} ${stock.medida}`,
      expiry: days === null ? "Sem validade" : days < 0 ? "Vencido" : days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)`,
      critical: alerta?.situacao === "vencido" || alerta?.situacao === "hoje",
    };
  });
  const visible = priorities.filter((item) => filter === "Todos" || (filter === "Até amanhã" ? item.critical : item.category === filter));
  return (
    <>
      <PageHeader eyebrow="Ação preventiva" title="Itens Prioritários" description="A ordem de uso é a calculada pelo servidor, da validade mais próxima para a mais distante." actions={<Button variant="secondary" onClick={() => navigate("Dashboard")}>Voltar ao dashboard</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Dentro do prazo" value={String(atencao)} detail={`Vencem ${prazoAlerta}`} icon="calendar" tone="warning" />
        <Summary label="Vencem hoje" value={String(vencemHoje)} detail="Situação informada pela API" icon="trash" tone="danger" />
        <Summary label="Já vencidos" value={String(vencidos)} detail="Ainda há quantidade em estoque" icon="chart" tone="warning" />
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-bold">Ordem recomendada de uso</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Lotes com quantidade positiva, na posição devolvida pela API.</p></div>
          <div className="flex gap-2 overflow-x-auto">{["Todos", "Até amanhã", ...new Set(priorities.map((item) => item.category))].map((item) => <button key={item} onClick={() => setFilter(item)} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${filter === item ? "bg-[var(--ink)] text-white" : "bg-[var(--surface-soft)] text-[var(--muted-strong)]"}`}>{item}</button>)}</div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {visible.map((item) => {
            return <article key={item.id} className="grid gap-4 p-5 transition sm:p-6 lg:grid-cols-[44px_minmax(0,1fr)_auto] lg:items-center">
              <span className={`grid size-10 place-items-center rounded-full text-sm font-bold ${item.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>{item.posicao}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"}`}>{item.expiry}</span></div>
                <p className="mt-1.5 text-sm text-[var(--muted-strong)]">{item.category} · {item.amount}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="dangerSoft" onClick={() => openWaste(item.id)}>Registrar baixa</Button>
              </div>
            </article>;
          })}
        </div>
        {visible.length === 0 && <p className="p-8 text-center text-sm text-[var(--muted-strong)]">Nenhum lote nesta seleção.</p>}
      </section>
    </>
  );
}
