/** Tipos TypeScript do relatório de desperdício. */

/** Forma de agrupar o relatório de desperdícios. Só esses quatro textos são aceitos. */
export type AgrupamentoRelatorio = "motivo" | "alimento" | "categoria" | "dia";

/** Período e agrupamento opcionais do relatório (viram parâmetros da URL). */
export type FiltroRelatorioDesperdicio = {
  data_inicio?: string;
  data_fim?: string;
  agrupar?: AgrupamentoRelatorio;
};

/** Um grupo do relatório, com quantidade somada e percentual sobre o total. */
export type GrupoRelatorioDesperdicio = {
  chave: string;      // identificador do grupo (ex.: "vencimento" ou "2026-11-10")
  rotulo: string;     // texto para exibir (ex.: "Vencimento")
  registros: number;  // quantos lançamentos caíram neste grupo
  quantidade: string; // soma das quantidades
  percentual: string; // participação no total, em texto decimal
};

/** Totais e grupos de desperdício no período pedido. */
export type RelatorioDesperdicio = {
  data_inicio: string | null; // null = sem limite inicial
  data_fim: string | null;
  agrupar: AgrupamentoRelatorio;
  total_registros: number;
  quantidade_total: string;
  grupos: GrupoRelatorioDesperdicio[];
};
