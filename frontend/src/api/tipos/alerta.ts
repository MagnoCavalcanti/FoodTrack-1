import type { SituacaoValidade } from "./estoque.ts";

/** Mensagem de validade pronta para exibir, calculada no servidor. */
export type AlertaValidade = {
  situacao: SituacaoValidade;
  mensagem: string;
  dias_restantes: number;
  estoque: number;
  alimento: string;
  validade: string;
  localizacao: string;
  quantidade_atual: string;
};
