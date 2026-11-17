import { useMemo, useState, type FormEvent } from "react";
import { formatQuantity, localDateOffset, localDateString, ajustarQuantidadeAMedida, medidaInteira } from "../api/formatacao";
import type { PageProps } from "./types";
import { downloadFile } from "./downloadFile";
import { EmptyState } from "./EmptyState";
import { Field } from "./Field";
import { MiniIcon } from "./MiniIcon";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";
import { StatusBadge } from "./StatusBadge";
import { Summary } from "./Summary";
import { Button } from "./Button";

/**
 * Uma linha da tabela de estoque: dados do lote (StockItem) + dados do
 * alimento (FoodItem) juntos e já formatados para exibir.
 */
type InventoryRow = {
  id: number;        // id do lote
  name: string;      // nome do alimento
  category: string;
  stock: string;     // quantidade formatada + medida, ex.: "2,5 Kg"
  quantity: string;  // quantidade crua, ex.: "2.500" (usada no formulário de edição)
  location: string;
  validity: string;  // validade formatada dd/mm/aaaa ou "Não informada"
  status: string;    // "Vencido" | "Atenção" | "Em dia" | "Sem validade"
  entry: string;     // data de entrada AAAA-MM-DD
};

/**
 * Tela "Estoque de Alimentos".
 * Junta alimento e estoque para exibir, filtrar e editar os registros de inventário.
 */
export default function InventoryPage({ navigate, notify, foods, stocks, restaurants, expiringStocks, saveStock, openWaste }: PageProps) {
  // ---------- Estado dos filtros ----------
  const [query, setQuery] = useState("");          // texto da busca
  const [category, setCategory] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  // ---------- Estado do modal de edição ----------
  const [detail, setDetail] = useState<InventoryRow | null>(null); // linha sendo editada (null = modal fechado)
  const [editForm, setEditForm] = useState({ quantidade_atual: "", localizacao: "", validade: "", entrada: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const today = localDateString();
  // Dicionário id do lote → situação calculada pelo servidor ("vencido", "hoje", "proximo").
  // useMemo só recalcula quando expiringStocks muda.
  const alertaPorEstoque = useMemo(() => new Map(expiringStocks.map((stock) => [stock.id, stock.situacao])), [expiringStocks]);
  // Monta as linhas da tabela e aplica os filtros.
  // O status preferencial vem da classificação do servidor; a data local cobre lotes fora dessa lista.
  // flatMap: cada lote vira [linha] ou [] (some da lista se o alimento não for encontrado).
  const rows = useMemo(() => stocks.flatMap((stock) => {
    const food = foods.find((item) => item.id === stock.alimento);
    if (!food) return [];
    const situacao = alertaPorEstoque.get(stock.id);
    const diasAlerta = restaurants.find((restaurant) => restaurant.id === food.restaurante)?.dias_alerta_validade;
    // Decide o status em cascata:
    // 1. Vencido: servidor disse "vencido" OU (sem info do servidor e validade < hoje);
    // 2. Atenção: servidor disse "hoje"/"proximo" OU validade dentro dos dias de alerta;
    // 3. Em dia: tem validade e não caiu nos casos acima;
    // 4. Sem validade: o lote não tem data.
    // (Datas AAAA-MM-DD podem ser comparadas como texto com < e <=.)
    const stockStatus = situacao === "vencido" || (!situacao && stock.validade && stock.validade < today)
      ? "Vencido"
      : situacao === "hoje" || situacao === "proximo" || (!situacao && stock.validade && diasAlerta !== undefined && stock.validade <= localDateOffset(diasAlerta))
        ? "Atenção"
        : stock.validade
          ? "Em dia"
          : "Sem validade";
    return [{
      id: stock.id,
      name: food.nome,
      category: food.categoria,
      stock: `${formatQuantity(stock.quantidade_atual)} ${food.medida}`,
      quantity: stock.quantidade_atual,
      location: stock.localizacao,
      validity: stock.validade ? new Date(`${stock.validade}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada",
      status: stockStatus,
      entry: stock.entrada,
    }];
  // Filtros: a linha fica se o nome contém a busca E bate com a categoria E com o status escolhidos.
  }).filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) &&
    (category === "Todas" || item.category === category) &&
    (status === "Todos" || item.status === status)
  ), [stocks, foods, restaurants, alertaPorEstoque, today, query, category, status]); // recalcula quando algum destes muda

  // Gera um CSV com as linhas visíveis (respeita os filtros) e baixa o arquivo.
  const exportInventory = () => {
    const csv = ["Produto,Categoria,Estoque,Local,Validade,Status", ...rows.map((item) => [item.name, item.category, item.stock, item.location, item.validity, item.status].map((value) => `"${value.replace(/"/g, '""')}"`).join(","))].join("\n");
    downloadFile("estoque-foodtrack.csv", csv, "text/csv");
    notify("Estoque exportado em CSV");
  };
  // Abre o modal de edição já preenchido com os dados do lote clicado.
  const openDetails = (item: InventoryRow) => {
    setDetail(item);
    setEditForm({ quantidade_atual: item.quantity, localizacao: item.location, validade: stocks.find((stock) => stock.id === item.id)?.validade || "", entrada: item.entry });
    setError("");
  };
  // Envio do modal: grava pelo App (saveStock), fecha o modal e mostra o Toast.
  // Em caso de erro, o modal continua aberto com a mensagem.
  const updateDetails = async (event: FormEvent) => {
    event.preventDefault(); // impede o navegador de recarregar a página ao enviar o form
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      await saveStock(detail.id, {
        quantidade_atual: editForm.quantidade_atual,
        localizacao: editForm.localizacao,
        validade: editForm.validade || null, // campo vazio vira null (lote sem validade)
        entrada: editForm.entrada,
      });
      setDetail(null);
      notify("Estoque atualizado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o estoque.");
    } finally {
      setSaving(false); // roda com sucesso ou erro: destrava o botão
    }
  };
  // Lista de categorias sem repetição, para o select de filtro.
  const categories = [...new Set(foods.map((food) => food.categoria))];

  return (
    <>
      {/* Cabeçalho com dois botões: Exportar e Cadastrar */}
      <PageHeader eyebrow="Gestão de inventário" title="Estoque de Alimentos" description="Dados carregados do estoque do restaurante na API." actions={<><Button variant="secondary" onClick={exportInventory} icon="download">Exportar estoque</Button><Button onClick={() => navigate("Cadastrar Alimento")} icon="plus">Cadastrar alimento</Button></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Registros de estoque" value={String(stocks.length)} detail="Itens retornados pela API" icon="box" />
        <Summary label="Alimentos cadastrados" value={String(foods.length)} detail="No restaurante atual" icon="filter" />
        <Summary label="Categorias monitoradas" value={String(categories.length)} detail="Categorias encontradas" icon="chart" />
        <Summary label="Sem validade" value={String(stocks.filter((stock) => !stock.validade).length)} detail="Validade não informada" icon="calendar" tone="warning" />
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
        {/* Barra de filtros: busca + categoria + status */}
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--icon)]"><MiniIcon name="search" /></span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-10" placeholder="Buscar por nome do alimento..." aria-label="Buscar no estoque" />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field lg:w-44" aria-label="Filtrar categoria"><option>Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="field lg:w-40" aria-label="Filtrar status"><option>Todos</option><option>Em dia</option><option>Atenção</option><option>Vencido</option><option>Sem validade</option></select>
        </div>
        {/* Tabela. overflow-x-auto permite rolar para o lado em telas estreitas.
            Cada linha tem os botões "Editar" (abre o modal) e "Baixa" (abre o registro de desperdício). */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead><tr className="border-b border-[var(--line)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted-strong)]"><th className="px-5 py-4">Alimento</th><th>Estoque</th><th>Localização</th><th>Validade</th><th>Status</th><th className="pr-5 text-right">Ação</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-soft)]"><td className="py-4 pl-5"><strong className="block">{item.name}</strong><span className="text-xs text-[var(--muted)]">{item.category}</span></td><td>{item.stock}</td><td>{item.location}</td><td className="font-semibold">{item.validity}</td><td><StatusBadge status={item.status} /></td><td className="pr-5 text-right"><Button variant="ghost" size="sm" onClick={() => openDetails(item)}>Editar</Button><Button variant="ghostDanger" size="sm" onClick={() => openWaste(item.id)}>Baixa</Button></td></tr>)}</tbody>
          </table>
          {rows.length === 0 && <EmptyState title="Nenhum alimento encontrado" description="Altere os filtros ou cadastre um novo alimento." action={() => { setQuery(""); setCategory("Todas"); setStatus("Todos"); }} actionLabel="Limpar filtros" />}
        </div>
        <div className="bg-[var(--surface-soft)] px-5 py-4 text-sm text-[var(--muted-strong)]">Exibindo {rows.length} registros de estoque.</div>
      </section>
      {/* Modal de edição do lote: só existe enquanto "detail" não é null.
          A quantidade usa a medida do alimento: passo 1 para un/maço/caixa, livre para kg/L. */}
      {detail && <Modal title={`Editar estoque: ${detail.name}`} close={() => setDetail(null)}><form onSubmit={updateDetails} className="grid gap-4 sm:grid-cols-2">
        <Field label={`Quantidade (${foods.find((food) => food.nome === detail.name)?.medida || ""})`} required><input required min="0" step={medidaInteira(foods.find((food) => food.nome === detail.name)?.medida) ? 1 : "any"} type="number" value={editForm.quantidade_atual} onChange={(event) => setEditForm((current) => ({ ...current, quantidade_atual: ajustarQuantidadeAMedida(event.target.value, foods.find((food) => food.nome === detail.name)?.medida) }))} className="field" /></Field>
        <Field label="Localização" required><input required maxLength={150} value={editForm.localizacao} onChange={(event) => setEditForm((current) => ({ ...current, localizacao: event.target.value }))} className="field" /></Field>
        <Field label="Validade"><input type="date" value={editForm.validade} onChange={(event) => setEditForm((current) => ({ ...current, validade: event.target.value }))} className="field" /></Field>
        <Field label="Data de entrada" required><input required type="date" value={editForm.entrada} onChange={(event) => setEditForm((current) => ({ ...current, entrada: event.target.value }))} className="field" /></Field>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setDetail(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></div>
      </form></Modal>}
    </>
  );
}
