/** Tipos TypeScript de estoque (lotes). */
import type { FoodItem } from "./alimento.ts";

/** Lote de estoque ligado a um alimento. Quantidades chegam como texto decimal. */
export type StockItem = {
  id: number;
  alimento: number;         // id do FoodItem (é uma chave estrangeira, não o objeto)
  quantidade_atual: string; // saldo do lote, ex.: "12.500"
  entrada: string;          // data de entrada AAAA-MM-DD
  saida: string | null;
  localizacao: string;      // ex.: "Câmara fria"
  validade: string | null;  // null = lote sem validade informada
};

/**
 * Dados enviados para abrir um lote. A saída nasce vazia no servidor.
 * Omit<T, "a"> = T sem os campos listados (o id é gerado pelo banco).
 */
export type NovoEstoque = Omit<StockItem, "id" | "saida">;

/** Classificação calculada pelo servidor para um lote dentro do prazo de alerta. */
export type SituacaoValidade = "vencido" | "hoje" | "proximo";

/**
 * Lote próximo do vencimento, já com nome do alimento e dias restantes.
 * StockItem & {...} = todos os campos do lote + os campos extras abaixo.
 */
export type EstoqueProximo = StockItem & {
  alimento_nome: string;
  categoria: FoodItem["categoria"]; // "o mesmo tipo do campo categoria de FoodItem"
  medida: FoodItem["medida"];
  restaurante: number;
  situacao: SituacaoValidade;
  dias_restantes: number;
};

/** Lote na fila de uso, ordenado pela validade mais próxima. */
export type EstoqueOrdenado = Omit<EstoqueProximo, "situacao" | "dias_restantes"> & {
  posicao: number; // 1 = usar primeiro
};
