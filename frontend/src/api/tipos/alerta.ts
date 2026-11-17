/**
 * Tipos TypeScript dos alertas de validade.
 * Arquivos em tipos/ não geram código no navegador: servem só para o editor
 * avisar quando usamos um campo que não existe ou com o tipo errado.
 */
import type { SituacaoValidade } from "./estoque.ts";

/** Mensagem de validade pronta para exibir, calculada no servidor. */
export type AlertaValidade = {
  situacao: SituacaoValidade; // "vencido" | "hoje" | "proximo"
  mensagem: string;           // texto pronto, ex.: "Vence em 2 dia(s)"
  dias_restantes: number;     // negativo quando já venceu
  estoque: number;            // id do lote (StockItem.id)
  alimento: string;           // nome do alimento (já vem resolvido)
  validade: string;           // data AAAA-MM-DD
  localizacao: string;
  quantidade_atual: string;   // decimal em texto, ex.: "2.500"
};
