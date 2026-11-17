/**
 * Funções de formatação e conversão usadas pelas telas.
 *
 * São funções "puras": não chamam a API nem usam React. Recebem um valor e
 * devolvem outro, por isso são fáceis de testar (veja tests/api.test.ts).
 */

// Formatador de números no padrão brasileiro (vírgula decimal, ponto de milhar),
// com no máximo 3 casas decimais. É criado uma vez e reaproveitado.
const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/**
 * Formata uma quantidade decimal para exibição em português e preserva texto inválido.
 * A API manda quantidades como texto ("2.500"); aqui vira "2,5".
 */
export function formatQuantity(quantity: string) {
  const value = Number(quantity);
  // Se não for número (ex.: texto estranho), devolve o original em vez de "NaN".
  return Number.isFinite(value) ? quantityFormatter.format(value) : quantity;
}

/** Medidas contadas em itens inteiros: não faz sentido lançar 0,38 unidade ou caixa. */
const MEDIDAS_INTEIRAS = ["un", "unidade", "unidades", "maço", "maços", "caixa", "caixas"];

/** Indica se a medida só aceita quantidades inteiras. */
export function medidaInteira(medida?: string) {
  // Boolean(medida) evita erro quando a medida é undefined; depois compara em minúsculas.
  return Boolean(medida) && MEDIDAS_INTEIRAS.includes(medida!.trim().toLowerCase());
}

/** Menor quantidade e passo dos campos: 1 para itens contados, 0,01 para peso e volume. */
export function passoDaMedida(medida?: string) {
  return medidaInteira(medida) ? 1 : 0.01;
}

/** Em medidas inteiras, descarta a parte decimal digitada ("0.007" vira "0"); nas demais, mantém o texto. */
export function ajustarQuantidadeAMedida(valor: string, medida?: string) {
  // A regex /[.,].*$/ apaga do primeiro ponto ou vírgula até o fim do texto.
  return medidaInteira(medida) ? valor.replace(/[.,].*$/, "") : valor;
}

/**
 * Converte uma data para o texto AAAA-MM-DD no fuso local.
 * Não usamos toISOString() porque ele converte para UTC: às 22h no Brasil
 * ele já devolveria o dia seguinte.
 */
export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  // getMonth() começa em 0 (janeiro = 0), por isso o +1. padStart deixa "05" em vez de "5".
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Devolve o primeiro e o último dia do mês civil, em AAAA-MM-DD. */
export function intervaloDoMes(data = new Date()) {
  const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
  // Truque: o dia 0 do mês seguinte é o último dia do mês atual.
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  // Os nomes das chaves já são os parâmetros que o backend espera.
  return { data_inicio: localDateString(inicio), data_fim: localDateString(fim) };
}

/** Devolve a data local de hoje deslocada em dias, no formato AAAA-MM-DD. */
export function localDateOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0); // zera o horário para comparar só a data
  date.setDate(date.getDate() + days); // days negativo volta no tempo (ex.: -27)
  return localDateString(date);
}

/** Traduz um valor de API para o rótulo conhecido, ou devolve o próprio valor. */
export function rotuloDe(opcoes: readonly { value: string; label: string }[], valor: string) {
  // Ex.: rotuloDe(PERFIS, "gerente") → "Gerente".
  return opcoes.find((opcao) => opcao.value === valor)?.label || valor;
}

/** Aplica a máscara de CNPJ (00.000.000/0000-00) e limita a entrada a 14 dígitos. */
export function mascararCnpj(valor: string) {
  // \D = qualquer coisa que não seja dígito. Mantém só os números, no máximo 14.
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  // Monta a máscara aos poucos, conforme a quantidade de dígitos já digitada.
  let mascarado = digitos.slice(0, 2);
  if (digitos.length > 2) mascarado += `.${digitos.slice(2, 5)}`;
  if (digitos.length > 5) mascarado += `.${digitos.slice(5, 8)}`;
  if (digitos.length > 8) mascarado += `/${digitos.slice(8, 12)}`;
  if (digitos.length > 12) mascarado += `-${digitos.slice(12, 14)}`;
  return mascarado;
}
