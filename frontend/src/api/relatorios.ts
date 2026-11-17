/**
 * Relatório de desperdício (/api/relatorios/desperdicios/).
 * O servidor já devolve os totais somados por grupo (motivo, dia...), então a
 * tela não precisa somar a lista bruta de registros.
 */
import { comConsulta, request } from "./cliente.ts";
import type { FiltroRelatorioDesperdicio, RelatorioDesperdicio } from "./tipos/relatorio.ts";

/** Busca totais de desperdício agrupados por motivo, alimento, categoria ou dia. */
export function getWasteReport(token: string, filtro: FiltroRelatorioDesperdicio = {}) {
  return request<RelatorioDesperdicio>(comConsulta("relatorios/desperdicios/", filtro), token);
}
