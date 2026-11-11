import { request } from "./cliente.ts";
import type { NovoUsuario, User } from "./tipos/usuario.ts";

/** Lista as contas do restaurante visível. Superusuário enxerga todas. */
export function listUsers(token: string) {
  return request<User[]>("usuarios/", token);
}

/** Devolve a conta autenticada pelo token, sem depender da lista de usuários. */
export function getCurrentUser(token: string) {
  return request<User>("usuarios/me/", token);
}

/** Cadastra uma conta no restaurante. Proprietário e gerente podem gravar. */
export function createUser(token: string, data: NovoUsuario) {
  return request<User>("usuarios/", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
