/**
 * Dispara o download de um arquivo de texto gerado no navegador.
 * Usado pelos botões "Exportar" (CSV) e de relatório. Não passa pelo backend.
 *
 * @param filename nome do arquivo baixado, ex.: "desperdicios.csv"
 * @param content  texto do arquivo
 * @param type     tipo MIME, ex.: "text/csv"
 */
export function downloadFile(filename: string, content: string, type: string) {
  // 1. Cria um "arquivo em memória" (Blob) e um endereço temporário para ele.
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  // 2. Cria um link <a download> invisível apontando para esse endereço...
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  // 3. ...e simula o clique, o que faz o navegador baixar o arquivo.
  anchor.click();
  // 4. Libera a memória do endereço temporário.
  URL.revokeObjectURL(url);
}
