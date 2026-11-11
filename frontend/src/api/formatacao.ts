const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** Formata uma quantidade decimal para exibição em português e preserva texto inválido. */
export function formatQuantity(quantity: string) {
  const value = Number(quantity);
  return Number.isFinite(value) ? quantityFormatter.format(value) : quantity;
}

/** Converte uma data para o texto AAAA-MM-DD no fuso local. */
export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Devolve o primeiro e o último dia do mês civil, em AAAA-MM-DD. */
export function intervaloDoMes(data = new Date()) {
  const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  return { data_inicio: localDateString(inicio), data_fim: localDateString(fim) };
}

/** Devolve a data local de hoje deslocada em dias, no formato AAAA-MM-DD. */
export function localDateOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

/** Traduz um valor de API para o rótulo conhecido, ou devolve o próprio valor. */
export function rotuloDe(opcoes: readonly { value: string; label: string }[], valor: string) {
  return opcoes.find((opcao) => opcao.value === valor)?.label || valor;
}

/** Aplica a máscara de CNPJ e limita a entrada a 14 dígitos. */
export function mascararCnpj(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  let mascarado = digitos.slice(0, 2);
  if (digitos.length > 2) mascarado += `.${digitos.slice(2, 5)}`;
  if (digitos.length > 5) mascarado += `.${digitos.slice(5, 8)}`;
  if (digitos.length > 8) mascarado += `/${digitos.slice(8, 12)}`;
  if (digitos.length > 12) mascarado += `-${digitos.slice(12, 14)}`;
  return mascarado;
}
