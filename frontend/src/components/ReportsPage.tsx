import { useEffect, useState } from "react";
import { localDateOffset, localDateString } from "../api/formatacao";
import { getWasteReport } from "../api/relatorios";
import type { RelatorioDesperdicio } from "../api/tipos/relatorio";
import type { PageProps } from "./types";
import { downloadFile } from "./downloadFile";
import { PageHeader } from "./PageHeader";
import { Rank } from "./Rank";
import { Summary } from "./Summary";
import { Button } from "./Button";

/**
 * Tela de Relatórios.
 * - Quatro cartões de resumo.
 * - Gráfico de barras com os desperdícios das últimas 4 semanas.
 * - Ranking de desperdício por motivo no mês (relatorioMes, carregado pelo App).
 */
export default function ReportsPage({ foods, stocks, waste, token, expiringStocks, relatorioMes }: PageProps) {
  // Relatório agrupado por dia dos últimos 28 dias. Esta página busca sozinha (useEffect abaixo).
  const [porDia, setPorDia] = useState<RelatorioDesperdicio | null>(null);
  const [erro, setErro] = useState("");
  const soon = expiringStocks.filter((stock) => stock.situacao !== "vencido").length;
  // Maior número de registros entre os motivos. Serve de 100% para as barras do ranking.
  // O 1 evita divisão por zero quando não há dados.
  const maxMotivo = Math.max(1, ...relatorioMes.grupos.map((grupo) => grupo.registros));
  const hoje = new Date();
  // Monta 4 semanas (index 0 = a mais antiga, 3 = a que termina hoje).
  // Para cada uma, soma os registros dos dias que caem entre start (inclusive) e end (exclusive).
  const semanas = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (3 - index) * 7 - 6);
    const end = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (3 - index) * 7 + 1);
    const count = (porDia?.grupos || []).filter((grupo) => {
      // No agrupamento por dia, a "chave" de cada grupo é a data AAAA-MM-DD.
      const date = new Date(`${grupo.chave}T00:00:00`);
      return date >= start && date < end;
    }).reduce((total, grupo) => total + grupo.registros, 0); // reduce = soma acumulada
    return { label: `Semana ${index + 1}`, count };
  });
  // Semana com mais registros = barra mais alta.
  const maxWeekCount = Math.max(1, ...semanas.map((week) => week.count));

  // O gráfico semanal usa o relatório agrupado por dia, não a lista bruta.
  // Roda ao abrir a tela e de novo quando "waste" muda (um desperdício novo foi gravado).
  useEffect(() => {
    // "ativo" evita gravar o resultado se o usuário já saiu da tela antes da resposta chegar.
    let ativo = true;
    setErro("");
    getWasteReport(token, {
      data_inicio: localDateOffset(-27),
      data_fim: localDateString(),
      agrupar: "dia",
    })
      .then((relatorio) => {
        if (ativo) setPorDia(relatorio);
      })
      .catch((caught: unknown) => {
        if (ativo) setErro(caught instanceof Error ? caught.message : "Não foi possível carregar o relatório por dia.");
      });
    // Função de limpeza: o React a chama ao sair da tela ou antes de rodar o efeito de novo.
    return () => { ativo = false; };
  }, [token, waste]);

  return (
    <>
      {/* Cabeçalho. O botão "Exportar" monta um CSV com todos os desperdícios:
          uma linha de títulos + uma linha por registro. Aspas dentro da descrição
          são duplicadas ("" ) para não quebrar o formato CSV. */}
      <PageHeader eyebrow="Resultados da operação" title="Relatórios" description="Os totais de desperdício vêm do relatório da API. Alimentos e estoques sem validade continuam nas listas desses recursos." actions={<Button variant="secondary" onClick={() => downloadFile("relatorio-foodtrack.csv", ["Tipo,ID,Data,Quantidade,Descricao", ...waste.map((record) => `Desperdício,${record.id},${record.data},${record.quantidade},"${record.descricao.replace(/"/g, '""')}"`)].join("\n"), "text/csv")} icon="download">Exportar desperdícios</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Alimentos cadastrados" value={String(foods.length)} detail="Registros no restaurante" icon="box" />
        <Summary label="Estoques próximos da validade" value={String(soon)} detail="Dentro do prazo de alerta" icon="calendar" tone="warning" />
        <Summary label="Desperdícios este mês" value={String(relatorioMes.total_registros)} detail={`${relatorioMes.quantidade_total} no período`} icon="trash" />
        <Summary label="Estoques sem validade" value={String(stocks.filter((stock) => !stock.validade).length)} detail="Sem data cadastrada" icon="filter" />
      </div>
      {erro && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{erro}</p>}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Gráfico de barras feito só com divs: a altura de cada barra é proporcional
            ao maior valor (máx. 78% da área; mín. 4% para a barra nunca sumir). */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-bold">Registros de desperdício por semana</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Contagem das últimas quatro semanas a partir do relatório agrupado por dia.</p>
          <div className="mt-7 grid h-64 grid-cols-4 items-end gap-3 border-b border-[var(--line)] px-2 sm:gap-6">{semanas.map((week) => <div key={week.label} className="flex h-full flex-col items-center justify-end"><strong className="mb-2 text-xs">{week.count}</strong><div className="w-full max-w-14 rounded-t-lg bg-[var(--brand)]" style={{ height: `${Math.max(4, week.count / maxWeekCount * 78)}%` }} /></div>)}</div>
          <div className="grid grid-cols-4 gap-3 px-2 pt-3 text-center text-xs text-[var(--muted)]">{semanas.map((week) => <span key={week.label}>{week.label}</span>)}</div>
        </section>
        {/* Ranking por motivo: uma barra (Rank) por grupo, proporcional ao motivo mais frequente */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-bold">Desperdício por motivo</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Grupos do mês, com o percentual calculado pela API.</p>
          <div className="mt-7 space-y-5">{relatorioMes.grupos.map((grupo) => <Rank key={grupo.chave} label={grupo.rotulo} value={`${grupo.registros} · ${grupo.percentual}%`} percent={`${grupo.registros / maxMotivo * 100}%`} />)}</div>
          {relatorioMes.grupos.length === 0 && <p className="mt-5 text-sm text-[var(--muted-strong)]">Não há desperdícios neste mês.</p>}
        </section>
      </div>
      <p className="mt-6 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)]">A API não fornece custos, metas ou conversão de unidades. A quantidade total do mês soma os valores registrados, mesmo quando as unidades diferem.</p>
    </>
  );
}
