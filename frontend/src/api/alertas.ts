import { comConsulta, request } from "./cliente.ts";
import type { AlertaValidade } from "./tipos/alerta.ts";

/** Busca as mensagens de validade do restaurante. O parâmetro dias substitui a antecedência configurada. */
export function listExpiryAlerts(token: string, dias?: number) {
  return request<AlertaValidade[]>(comConsulta("alertas/validade/", { dias }), token);
}
