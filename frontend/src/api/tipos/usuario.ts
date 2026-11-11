/** Conta autenticável vinculada, ou não, a um restaurante. */
export type User = {
  id: number;
  username: string;
  nome: string;
  email: string;
  perfil: string;
  restaurante: number | null;
  is_superuser: boolean;
};

/** Dados enviados para cadastrar uma conta. A senha não volta na resposta. */
export type NovoUsuario = Pick<User, "username" | "nome" | "email" | "perfil"> & {
  password: string;
  restaurante?: number;
};

export const PERFIL_ADMINISTRADOR = {
  value: "superuser",
  label: "Administrador do site",
} as const;

export const PERFIS = [
  { value: "proprietario", label: "Proprietário" },
  { value: "gerente", label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
] as const;

export const ROTULOS_PERFIL = [PERFIL_ADMINISTRADOR, ...PERFIS] as const;
