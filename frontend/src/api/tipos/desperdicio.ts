/** Tipos TypeScript dos registros de desperdício (baixas). */

/** Registro de perda ligado a um lote e à conta que o lançou. */
export type WasteRecord = {
  id: number;
  motivo: string;     // valor interno, ex.: "vencimento" (o rótulo vem de MotivoDesperdicio)
  descricao: string;  // texto livre opcional
  quantidade: string; // decimal em texto, ex.: "0.500"
  data: string;       // AAAA-MM-DD
  estoque: number;    // id do lote de onde a quantidade saiu
  usuario: number;    // id da conta que registrou
};

/**
 * Dados enviados para lançar uma perda. O usuário é definido pelo token.
 * Pick<T, "a" | "b"> = um tipo novo só com os campos escolhidos de T.
 */
export type NovoDesperdicio = Pick<WasteRecord, "motivo" | "descricao" | "quantidade" | "data" | "estoque">;

/** Filtros aceitos pela listagem de desperdícios. O "?" torna cada um opcional. */
export type FiltroDesperdicio = {
  data_inicio?: string;
  data_fim?: string;
  motivo?: string;
  usuario?: number;
  estoque?: number;
};

/** Opção de motivo devolvida pela API, com valor persistido e rótulo legível. */
export type MotivoDesperdicio = {
  valor: string;  // o que é salvo no banco
  rotulo: string; // o que aparece na tela
};

/**
 * Lista fixa de motivos (cópia local). As telas usam a lista vinda da API
 * (/desperdicios/motivos/); esta constante é usada nos testes.
 * "as const" deixa o array somente leitura e com os textos exatos como tipo.
 */
export const MOTIVOS_DESPERDICIO = [
  { value: "vencimento", label: "Vencimento" },
  { value: "armazenamento_inadequado", label: "Armazenamento inadequado" },
  { value: "excesso_de_compra", label: "Excesso de compra" },
  { value: "excesso_de_producao", label: "Excesso de produção" },
  { value: "erro_de_preparo", label: "Erro de preparo" },
  { value: "outro", label: "Outro" },
] as const;
