import { useState } from "react";
import { formatQuantity, localDateString, MOTIVOS_DESPERDICIO, rotuloDe } from "../api";
import type { PageProps } from "./types";
import { PageHeader, PrimaryButton, SecondaryButton, Summary, downloadFile } from "./ui";

export default function WastePage({ openWaste, waste, stocks, foods, users }: PageProps) {
  const [period, setPeriod] = useState("Este mês");
  const now = new Date();
  // O histórico já veio da API; o filtro de período desta tela é local.
  const visibleRecords = waste.filter((record) => {
    const date = new Date(`${record.data}T00:00:00`);
    if (period === "Hoje") return record.data === localDateString(now);
    if (period === "Esta semana") return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    if (period === "Este mês") return record.data.startsWith(localDateString(now).slice(0, 7));
    return true;
  });
  const userById = new Map(users.map((item) => [item.id, item]));
  // Os registros guardam IDs; a página resolve as relações para exibir nomes.
  const resolveUser = (id: number) => userById.get(id)?.nome || `Usuário ${id}`;
  const resolveStock = (id: number) => stocks.find((stock) => stock.id === id);
  const resolveFood = (id: number) => {
    const stock = resolveStock(id);
    return stock ? foods.find((food) => food.id === stock.alimento) : undefined;
  };
  const csv = ["Data,Alimento,Quantidade,Motivo,Descrição,Responsável", ...visibleRecords.map((record) => {
    const food = resolveFood(record.estoque);
    return [record.data, food?.nome || "Alimento não encontrado", `${formatQuantity(record.quantidade)} ${food?.medida || ""}`, rotuloDe(MOTIVOS_DESPERDICIO, record.motivo), record.descricao, resolveUser(record.usuario)]
      .map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
  })].join("\n");
  return (
    <>
      <PageHeader eyebrow="Controle de perdas" title="Desperdícios" description="Registros carregados da API. A criação de uma baixa não altera automaticamente a quantidade do estoque." actions={<PrimaryButton onClick={openWaste} icon="plus">Registrar desperdício</PrimaryButton>} />
      <div className="grid gap-4 sm:grid-cols-2"><Summary label="Registros no período" value={String(visibleRecords.length)} detail="Baixas registradas na API" icon="trash" /><Summary label="Registros totais" value={String(waste.length)} detail="Histórico disponível" icon="filter" /></div>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-bold">Histórico de registros</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Descrição e responsável vêm dos registros reais.</p></div><div className="flex flex-wrap gap-3"><select value={period} onChange={(e) => setPeriod(e.target.value)} className="field w-auto" aria-label="Filtrar período"><option>Hoje</option><option>Esta semana</option><option>Este mês</option><option>Todo o período</option></select><SecondaryButton onClick={() => downloadFile("desperdicios.csv", csv, "text/csv")} icon="download">Exportar</SecondaryButton></div></div>
        <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[700px] text-left text-sm"><thead><tr className="text-xs uppercase text-[var(--muted)]"><th className="py-4">Data</th><th>Alimento</th><th>Quantidade</th><th>Motivo</th><th>Descrição</th><th>Responsável</th></tr></thead><tbody>{visibleRecords.map((record) => { const stock = resolveStock(record.estoque); const food = resolveFood(record.estoque); return <tr key={record.id} className="border-t border-[var(--line)]"><td className="py-4 text-[var(--muted-strong)]">{new Date(`${record.data}T00:00:00`).toLocaleDateString("pt-BR")}</td><td className="font-semibold">{food?.nome || `Alimento ${stock?.alimento ?? "não encontrado"}`}</td><td>{formatQuantity(record.quantidade)} {food?.medida}</td><td>{rotuloDe(MOTIVOS_DESPERDICIO, record.motivo)}</td><td>{record.descricao || "—"}</td><td>{resolveUser(record.usuario)}</td></tr>; })}</tbody></table>{visibleRecords.length === 0 && <p className="py-10 text-center text-sm text-[var(--muted-strong)]">Nenhum registro nesse período.</p>}</div>
      </section>
    </>
  );
}
