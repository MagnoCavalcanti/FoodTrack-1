import { request } from "./cliente.ts";

/** Confere se a API está no ar, sem exigir autenticação. */
export function checkHealth() {
  return request<{ status: string }>("saude/");
}
