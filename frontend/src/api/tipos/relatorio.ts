/** Forma de agrupar o relatório de desperdícios. */
export type AgrupamentoRelatorio = "motivo" | "alimento" | "categoria" | "dia";

/** Período e agrupamento opcionais do relatório. */
export type FiltroRelatorioDesperdicio = {
  data_inicio?: string;
  data_fim?: string;
  agrupar?: AgrupamentoRelatorio;
};

/** Um grupo do relatório, com quantidade somada e percentual sobre o total. */
export type GrupoRelatorioDesperdicio = {
  chave: string;
  rotulo: string;
  registros: number;
  quantidade: string;
  percentual: string;
};

/** Totais e grupos de desperdício no período pedido. */
export type RelatorioDesperdicio = {
  data_inicio: string | null;
  data_fim: string | null;
  agrupar: AgrupamentoRelatorio;
  total_registros: number;
  quantidade_total: string;
  grupos: GrupoRelatorioDesperdicio[];
};
