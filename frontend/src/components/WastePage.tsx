import { useEffect, useState } from "react";
import { listWaste } from "../api/desperdicios";
import type { FiltroDesperdicio, WasteRecord } from "../api/tipos/desperdicio";
import { formatQuantity, localDateString } from "../api/formatacao";
import type { PageProps } from "./types";
import { downloadFile } from "./downloadFile";
import { PageHeader } from "./PageHeader";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";
import { Summary } from "./Summary";

/** Converte o período da tela nos parâmetros data_inicio e data_fim da listagem. */
function filtroDoPeriodo(period: string): FiltroDesperdicio {
  const hoje = new Date();
  if (period === "Hoje") {
    const dia = localDateString(hoje);
    return { data_inicio: dia, data_fim: dia };
  }
  if (period === "Esta semana") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
    return { data_inicio: localDateString(inicio), data_fim: localDateString(hoje) };
  }
  if (period === "Este mês") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { data_inicio: localDateString(inicio), data_fim: localDateString(fim) };
  }
  return {};
}

export default function WastePage({ openWaste, waste, stocks, foods, users, token, motivos }: PageProps) {
  const [period, setPeriod] = useState("Este mês");
  const [visibleRecords, setVisibleRecords] = useState<WasteRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [error, setError] = useState("");
  const userById = new Map(users.map((item) => [item.id, item]));
  const rotuloMotivo = (valor: string) => motivos.find((motivo) => motivo.valor === valor)?.rotulo || valor;

  // O período escolhido é filtrado no servidor, não na lista já carregada.
  useEffect(() => {
    let ativo = true;
    setLoadingRecords(true);
    setError("");
    listWaste(token, filtroDoPeriodo(period))
      .then((registros) => {
        if (ativo) setVisibleRecords(registros);
      })
      .catch((caught: unknown) => {
        if (!ativo) return;
        setVisibleRecords([]);
        setError(caught instanceof Error ? caught.message : "Não foi possível filtrar os desperdícios.");
      })
      .finally(() => {
        if (ativo) setLoadingRecords(false);
      });
    return () => { ativo = false; };
  }, [token, period, waste]);

  const resolveUser = (id: number) => userById.get(id)?.nome || `Usuário ${id}`;
  const resolveStock = (id: number) => stocks.find((stock) => stock.id === id);
  const resolveFood = (id: number) => {
    const stock = resolveStock(id);
    return stock ? foods.find((food) => food.id === stock.alimento) : undefined;
  };
  const csv = ["Data,Alimento,Quantidade,Motivo,Descrição,Responsável", ...visibleRecords.map((record) => {
    const food = resolveFood(record.estoque);
    return [record.data, food?.nome || "Alimento não encontrado", `${formatQuantity(record.quantidade)} ${food?.medida || ""}`, rotuloMotivo(record.motivo), record.descricao, resolveUser(record.usuario)]
      .map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
  })].join("\n");
  return (
    <>
      <PageHeader eyebrow="Controle de perdas" title="Desperdícios" description="O histórico respeita o período enviado para a API. Cada baixa desconta a quantidade do lote." actions={<PrimaryButton onClick={openWaste} icon="plus">Registrar desperdício</PrimaryButton>} />
      <div className="grid gap-4 sm:grid-cols-2"><Summary label="Registros no período" value={loadingRecords ? "…" : String(visibleRecords.length)} detail="Filtro aplicado na API" icon="trash" /><Summary label="Registros totais" value={String(waste.length)} detail="Histórico completo" icon="filter" /></div>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-bold">Histórico de registros</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Motivos e responsáveis vêm das rotas de desperdício e usuários.</p></div><div className="flex flex-wrap gap-3"><select value={period} onChange={(e) => setPeriod(e.target.value)} className="field w-auto" aria-label="Filtrar período"><option>Hoje</option><option>Esta semana</option><option>Este mês</option><option>Todo o período</option></select><SecondaryButton onClick={() => downloadFile("desperdicios.csv", csv, "text/csv")} icon="download">Exportar</SecondaryButton></div></div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[700px] text-left text-sm"><thead><tr className="text-xs uppercase text-[var(--muted)]"><th className="py-4">Data</th><th>Alimento</th><th>Quantidade</th><th>Motivo</th><th>Descrição</th><th>Responsável</th></tr></thead><tbody>{visibleRecords.map((record) => { const stock = resolveStock(record.estoque); const food = resolveFood(record.estoque); return <tr key={record.id} className="border-t border-[var(--line)]"><td className="py-4 text-[var(--muted-strong)]">{new Date(`${record.data}T00:00:00`).toLocaleDateString("pt-BR")}</td><td className="font-semibold">{food?.nome || `Alimento ${stock?.alimento ?? "não encontrado"}`}</td><td>{formatQuantity(record.quantidade)} {food?.medida}</td><td>{rotuloMotivo(record.motivo)}</td><td>{record.descricao || "—"}</td><td>{resolveUser(record.usuario)}</td></tr>; })}</tbody></table>{!loadingRecords && visibleRecords.length === 0 && !error && <p className="py-10 text-center text-sm text-[var(--muted-strong)]">Nenhum registro nesse período.</p>}{loadingRecords && <p className="py-10 text-center text-sm text-[var(--muted-strong)]">Carregando registros do período.</p>}</div>
      </section>
    </>
  );
}
