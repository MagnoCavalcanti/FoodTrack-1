/**
 * Login e logout (/api/token/ e /api/logout/).
 * O token devolvido no login é salvo no localStorage pelo App.tsx e enviado
 * em todas as outras requisições.
 */
import { request } from "./cliente.ts";

/** Troca usuário e senha pelo token usado depois no cabeçalho Authorization. */
export function login(username: string, password: string) {
  // undefined no lugar do token: ainda não estamos logados.
  return request<{ token: string }>("token/", undefined, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/** Apaga no servidor o token da conta autenticada e encerra a sessão. */
export function logout(token: string) {
  return request<void>("logout/", token, { method: "POST" });
}
