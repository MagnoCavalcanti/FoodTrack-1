import type { FoodItem } from "./alimento.ts";

/** Lote de estoque ligado a um alimento. Quantidades chegam como texto decimal. */
export type StockItem = {
  id: number;
  alimento: number;
  quantidade_atual: string;
  entrada: string;
  saida: string | null;
  localizacao: string;
  validade: string | null;
};

/** Dados enviados para abrir um lote. A saída nasce vazia no servidor. */
export type NovoEstoque = Omit<StockItem, "id" | "saida">;

/** Classificação calculada pelo servidor para um lote dentro do prazo de alerta. */
export type SituacaoValidade = "vencido" | "hoje" | "proximo";

/** Lote próximo do vencimento, já com nome do alimento e dias restantes. */
export type EstoqueProximo = StockItem & {
  alimento_nome: string;
  categoria: FoodItem["categoria"];
  medida: FoodItem["medida"];
  restaurante: number;
  situacao: SituacaoValidade;
  dias_restantes: number;
};

/** Lote na fila de uso, ordenado pela validade mais próxima. */
export type EstoqueOrdenado = Omit<EstoqueProximo, "situacao" | "dias_restantes"> & {
  posicao: number;
};
