/** Restaurante visível para a conta autenticada. */
export type Restaurant = {
  id: number;
  nome: string;
  cnpj: string;
  dias_alerta_validade: number;
};

/** Recorte usado para ler e gravar só a antecedência do alerta de validade. */
export type ConfiguracaoRestaurante = Pick<Restaurant, "id" | "nome" | "dias_alerta_validade">;
