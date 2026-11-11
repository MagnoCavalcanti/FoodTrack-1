/** Registro de perda ligado a um lote e à conta que o lançou. */
export type WasteRecord = {
  id: number;
  motivo: string;
  descricao: string;
  quantidade: string;
  data: string;
  estoque: number;
  usuario: number;
};

/** Dados enviados para lançar uma perda. O usuário é definido pelo token. */
export type NovoDesperdicio = Pick<WasteRecord, "motivo" | "descricao" | "quantidade" | "data" | "estoque">;

/** Filtros aceitos pela listagem de desperdícios. */
export type FiltroDesperdicio = {
  data_inicio?: string;
  data_fim?: string;
  motivo?: string;
  usuario?: number;
  estoque?: number;
};

/** Opção de motivo devolvida pela API, com valor persistido e rótulo legível. */
export type MotivoDesperdicio = {
  valor: string;
  rotulo: string;
};

export const MOTIVOS_DESPERDICIO = [
  { value: "vencimento", label: "Vencimento" },
  { value: "armazenamento_inadequado", label: "Armazenamento inadequado" },
  { value: "excesso_de_compra", label: "Excesso de compra" },
  { value: "excesso_de_producao", label: "Excesso de produção" },
  { value: "erro_de_preparo", label: "Erro de preparo" },
  { value: "outro", label: "Outro" },
] as const;
