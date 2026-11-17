/**
 * Rotas de alimentos (/api/alimentos/).
 * Um alimento é o "produto" (nome, categoria, medida). A quantidade e a
 * validade ficam no estoque (lote), em estoques.ts.
 */
import { request } from "./cliente.ts";
import type { FoodItem, NovoAlimento } from "./tipos/alimento.ts";

/** Lista os alimentos do restaurante visível para a conta autenticada. */
export function listFoods(token: string) {
  return request<FoodItem[]>("alimentos/", token);
}

/** Cadastra um alimento. Usuário comum fica preso ao próprio restaurante. */
export function createFood(token: string, data: NovoAlimento) {
  return request<FoodItem>("alimentos/", token, {
    method: "POST",
    body: JSON.stringify(data), // o objeto vira texto JSON para ir no corpo
  });
}
