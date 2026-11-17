/** Tipos TypeScript de usuário e a lista de perfis. */

/** Conta autenticável vinculada, ou não, a um restaurante. */
export type User = {
  id: number;
  username: string;          // login
  nome: string;              // nome exibido na tela
  email: string;
  perfil: string;            // "proprietario" | "gerente" | "funcionario"
  restaurante: number | null; // null para o superusuário, que vê todos
  is_superuser: boolean;     // administrador do site
};

/**
 * Dados enviados para cadastrar uma conta. A senha não volta na resposta.
 * O "&" junta dois tipos: os campos escolhidos de User + password e restaurante.
 */
export type NovoUsuario = Pick<User, "username" | "nome" | "email" | "perfil"> & {
  password: string;
  restaurante?: number;
};

/** Rótulo usado para exibir o superusuário (não é um perfil escolhível no cadastro). */
export const PERFIL_ADMINISTRADOR = {
  value: "superuser",
  label: "Administrador do site",
} as const;

/** Perfis oferecidos no cadastro de membro da equipe. */
export const PERFIS = [
  { value: "proprietario", label: "Proprietário" },
  { value: "gerente", label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
] as const;

/** Todos os rótulos possíveis, usados para traduzir o perfil na tela (com rotuloDe). */
export const ROTULOS_PERFIL = [PERFIL_ADMINISTRADOR, ...PERFIS] as const;
