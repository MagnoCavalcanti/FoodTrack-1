/**
 * Rota de saúde (/api/saude/): só diz se o backend está respondendo.
 * Hoje nenhuma tela usa esta função; fica disponível para diagnóstico.
 */
import { request } from "./cliente.ts";

/** Confere se a API está no ar, sem exigir autenticação. */
export function checkHealth() {
  return request<{ status: string }>("saude/");
}
