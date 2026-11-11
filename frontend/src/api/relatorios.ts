import { comConsulta, request } from "./cliente.ts";
import type { FiltroRelatorioDesperdicio, RelatorioDesperdicio } from "./tipos/relatorio.ts";

/** Busca totais de desperdício agrupados por motivo, alimento, categoria ou dia. */
export function getWasteReport(token: string, filtro: FiltroRelatorioDesperdicio = {}) {
  return request<RelatorioDesperdicio>(comConsulta("relatorios/desperdicios/", filtro), token);
}
