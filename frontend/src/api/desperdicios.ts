import { comConsulta, request } from "./cliente.ts";
import type { FiltroDesperdicio, MotivoDesperdicio, NovoDesperdicio, WasteRecord } from "./tipos/desperdicio.ts";

/** Lista o histórico de perdas do restaurante, com filtros opcionais de período, motivo, usuário e lote. */
export function listWaste(token: string, filtro: FiltroDesperdicio = {}) {
  return request<WasteRecord[]>(comConsulta("desperdicios/", filtro), token);
}

/** Registra uma perda. A conta autora é a do token, não a enviada no corpo. */
export function createWaste(token: string, data: NovoDesperdicio) {
  return request<WasteRecord>("desperdicios/", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Lista os motivos oficiais de desperdício para montar formulários e filtros. */
export function listWasteReasons(token: string) {
  return request<MotivoDesperdicio[]>("desperdicios/motivos/", token);
}
