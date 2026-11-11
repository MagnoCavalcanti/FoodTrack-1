import { comConsulta, request } from "./cliente.ts";
import type { EstoqueOrdenado, EstoqueProximo, NovoEstoque, StockItem } from "./tipos/estoque.ts";

/** Lista os lotes do restaurante, do mais recente para o mais antigo. */
export function listStocks(token: string) {
  return request<StockItem[]>("estoques/", token);
}

/** Abre um lote de estoque ligado a um alimento do restaurante. */
export function createStock(token: string, data: NovoEstoque) {
  return request<StockItem>("estoques/", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Atualiza quantidade, validade, entrada ou localização de um lote existente. */
export function updateStock(token: string, id: number, data: Partial<Omit<StockItem, "id">>) {
  return request<StockItem>(`estoques/${id}/`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Lista lotes com quantidade positiva dentro do prazo de alerta, incluindo os vencidos. */
export function listExpiringStocks(token: string, dias?: number) {
  return request<EstoqueProximo[]>(comConsulta("estoques/proximos-vencimento/", { dias }), token);
}

/** Lista lotes com quantidade positiva na ordem em que devem ser usados. */
export function listUsageOrder(token: string) {
  return request<EstoqueOrdenado[]>("estoques/ordem-utilizacao/", token);
}
