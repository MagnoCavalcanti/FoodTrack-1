import { comConsulta, request } from "./cliente.ts";
import type { ConfiguracaoRestaurante, Restaurant } from "./tipos/restaurante.ts";

/** Lista o restaurante da conta, ou todos os restaurantes quando a conta é superusuário. */
export function listRestaurants(token: string) {
  return request<Restaurant[]>("restaurantes/", token);
}

/** Atualiza nome, CNPJ e dias de alerta. A escrita é exclusiva do superusuário. */
export function updateRestaurant(token: string, id: number, data: Pick<Restaurant, "nome" | "cnpj" | "dias_alerta_validade">) {
  return request<Restaurant>(`restaurantes/${id}/`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Lê a antecedência do alerta do restaurante da conta, ou do restaurante indicado pelo superusuário. */
export function getRestaurantSettings(token: string, restaurante?: number) {
  return request<ConfiguracaoRestaurante>(comConsulta("restaurantes/me/configuracao/", { restaurante }), token);
}

/** Grava os dias de alerta do restaurante da conta. Proprietário e gerente podem alterar. */
export function updateRestaurantSettings(token: string, data: Pick<ConfiguracaoRestaurante, "dias_alerta_validade">, restaurante?: number) {
  return request<ConfiguracaoRestaurante>(comConsulta("restaurantes/me/configuracao/", { restaurante }), token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
