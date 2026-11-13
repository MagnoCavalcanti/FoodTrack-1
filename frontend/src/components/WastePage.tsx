import { useEffect, useState, type FormEvent } from "react";
import { listWaste } from "../api/desperdicios";
import type { FiltroDesperdicio, WasteRecord } from "../api/tipos/desperdicio";
import { formatQuantity, localDateString, ajustarQuantidadeAMedida, medidaInteira, passoDaMedida } from "../api/formatacao";
import type { PageProps } from "./types";
import { downloadFile } from "./downloadFile";
import { Field } from "./Field";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";
import { Summary } from "./Summary";
import { Button } from "./Button";

/** Converte o período da tela nos parâmetros data_inicio e data_fim da listagem. */
function filtroDoPeriodo(period: string): FiltroDesperdicio {
  const hoje = new Date();
  if (period === "Hoje") {
    const dia = localDateString(hoje);
    return { data_inicio: dia, data_fim: dia };
  }
  if (period === "Esta semana") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
    return { data_inicio: localDateString(inicio), data_fim: localDateString(hoje) };
  }
  if (period === "Este mês") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { data_inicio: localDateString(inicio), data_fim: localDateString(fim) };
  }
  return {};
}

export default function WastePage({ openWaste, notify, waste, stocks, foods, users, token, motivos, updateWaste, removeWaste }: PageProps) {
  const [period, setPeriod] = useState("Este mês");
  const [visibleRecords, setVisibleRecords] = useState<WasteRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<WasteRecord | null>(null);
  const [editForm, setEditForm] = useState({ estoque: "", quantidade: "", motivo: "", descricao: "", data: "" });
  const [deleting, setDeleting] = useState<WasteRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const userById = new Map(users.map((item) => [item.id, item]));
  const rotuloMotivo = (valor: string) => motivos.find((motivo) => motivo.valor === valor)?.rotulo || valor;

  // O período escolhido é filtrado no servidor, não na lista já carregada.
  useEffect(() => {
    let ativo = true;
    setLoadingRecords(true);
    setError("");
    listWaste(token, filtroDoPeriodo(period))
      .then((registros) => {
        if (ativo) setVisibleRecords(registros);
      })
      .catch((caught: unknown) => {
        if (!ativo) return;
        setVisibleRecords([]);
        setError(caught instanceof Error ? caught.message : "Não foi possível filtrar os desperdícios.");
      })
      .finally(() => {
        if (ativo) setLoadingRecords(false);
      });
    return () => { ativo = false; };
  }, [token, period, waste]);

  const resolveUser = (id: number) => userById.get(id)?.nome || `Usuário ${id}`;
  const resolveStock = (id: number) => stocks.find((stock) => stock.id === id);
  const resolveFood = (id: number) => {
    const stock = resolveStock(id);
    return stock ? foods.find((food) => food.id === stock.alimento) : undefined;
  };
  // Saldo que a baixa editada pode usar: no mesmo lote, a quantidade antiga volta para o saldo.
  const disponivelNaEdicao = () => {
    if (!editing) return NaN;
    const saldo = Number(resolveStock(Number(editForm.estoque))?.quantidade_atual);
    return Number(editForm.estoque) === editing.estoque ? saldo + Number(editing.quantidade) : saldo;
  };
  const openEdit = (record: WasteRecord) => {
    setEditing(record);
    setEditForm({ estoque: String(record.estoque), quantidade: record.quantidade, motivo: record.motivo, descricao: record.descricao, data: record.data });
    setModalError("");
  };
  const openDelete = (record: WasteRecord) => {
    setDeleting(record);
    setModalError("");
  };
  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setModalError("");
    const quantidade = Number(editForm.quantidade.replace(",", "."));
    const inteira = medidaInteira(editingFood?.medida);
    if (!Number.isFinite(quantidade) || quantidade < passoDaMedida(editingFood?.medida) || (inteira && !Number.isInteger(quantidade))) {
      setModalError(inteira ? "Informe uma quantidade inteira de pelo menos 1." : "Informe uma quantidade de pelo menos 0,01.");
      return;
    }
    if (quantidade > disponivelNaEdicao()) {
      setModalError(`A quantidade não pode ser maior que o saldo disponível no lote (${formatQuantity(String(disponivelNaEdicao()))}).`);
      return;
    }
    setSaving(true);
    try {
      await updateWaste(editing, { estoque: Number(editForm.estoque), quantidade: quantidade.toFixed(3), motivo: editForm.motivo, descricao: editForm.descricao, data: editForm.data });
      setEditing(null);
      notify("Desperdício atualizado e saldo do lote ajustado.");
    } catch (caught) {
      setModalError(caught instanceof Error ? caught.message : "Não foi possível atualizar o desperdício.");
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setModalError("");
    try {
      await removeWaste(deleting);
      setDeleting(null);
      notify("Desperdício excluído e quantidade devolvida ao lote.");
    } catch (caught) {
      setModalError(caught instanceof Error ? caught.message : "Não foi possível excluir o desperdício.");
    } finally {
      setSaving(false);
    }
  };
  const deletingFood = deleting ? resolveFood(deleting.estoque) : undefined;
  const editingFood = editing ? resolveFood(Number(editForm.estoque)) : undefined;

  const csv = ["Data,Alimento,Quantidade,Motivo,Descrição,Responsável", ...visibleRecords.map((record) => {
    const food = resolveFood(record.estoque);
    return [record.data, food?.nome || "Alimento não encontrado", `${formatQuantity(record.quantidade)} ${food?.medida || ""}`, rotuloMotivo(record.motivo), record.descricao, resolveUser(record.usuario)]
      .map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
  })].join("\n");
  return (
    <>
      <PageHeader eyebrow="Controle de perdas" title="Desperdícios" description="O histórico respeita o período enviado para a API. Cada baixa desconta a quantidade do lote." actions={<Button onClick={openWaste} icon="plus">Registrar desperdício</Button>} />
      <div className="grid gap-4 sm:grid-cols-2"><Summary label="Registros no período" value={loadingRecords ? "…" : String(visibleRecords.length)} detail="Filtro aplicado na API" icon="trash" /><Summary label="Registros totais" value={String(waste.length)} detail="Histórico completo" icon="filter" /></div>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-bold">Histórico de registros</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">Motivos e responsáveis vêm das rotas de desperdício e usuários.</p></div><div className="flex flex-wrap gap-3"><select value={period} onChange={(e) => setPeriod(e.target.value)} className="field w-auto" aria-label="Filtrar período"><option>Hoje</option><option>Esta semana</option><option>Este mês</option><option>Todo o período</option></select><Button variant="secondary" onClick={() => downloadFile("desperdicios.csv", csv, "text/csv")} icon="download">Exportar</Button></div></div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[820px] text-left text-sm"><thead><tr className="text-xs uppercase text-[var(--muted)]"><th className="py-4">Data</th><th>Alimento</th><th>Quantidade</th><th>Motivo</th><th>Descrição</th><th>Responsável</th><th className="text-right">Ações</th></tr></thead><tbody>{visibleRecords.map((record) => { const stock = resolveStock(record.estoque); const food = resolveFood(record.estoque); return <tr key={record.id} className="border-t border-[var(--line)]"><td className="py-4 text-[var(--muted-strong)]">{new Date(`${record.data}T00:00:00`).toLocaleDateString("pt-BR")}</td><td className="font-semibold">{food?.nome || `Alimento ${stock?.alimento ?? "não encontrado"}`}</td><td>{formatQuantity(record.quantidade)} {food?.medida}</td><td>{rotuloMotivo(record.motivo)}</td><td>{record.descricao || "—"}</td><td>{resolveUser(record.usuario)}</td><td className="whitespace-nowrap text-right"><Button variant="ghost" size="sm" onClick={() => openEdit(record)}>Editar</Button><Button variant="ghostDanger" size="sm" onClick={() => openDelete(record)}>Excluir</Button></td></tr>; })}</tbody></table>{!loadingRecords && visibleRecords.length === 0 && !error && <p className="py-10 text-center text-sm text-[var(--muted-strong)]">Nenhum registro nesse período.</p>}{loadingRecords && <p className="py-10 text-center text-sm text-[var(--muted-strong)]">Carregando registros do período.</p>}</div>
      </section>

      {editing && <Modal title="Editar desperdício" close={() => setEditing(null)}><form onSubmit={submitEdit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Estoque" required><select required value={editForm.estoque} onChange={(event) => setEditForm((current) => ({ ...current, estoque: event.target.value }))} className="field">{stocks.map((stock) => { const food = foods.find((item) => item.id === stock.alimento); return <option key={stock.id} value={stock.id}>{food?.nome || `Alimento ${stock.alimento}`} · {stock.localizacao} ({formatQuantity(stock.quantidade_atual)} {food?.medida || ""})</option>; })}</select></Field></div>
        <div><Field label="Quantidade" required><input required type="number" min="0" step={medidaInteira(editingFood?.medida) ? 1 : "any"} value={editForm.quantidade} onChange={(event) => setEditForm((current) => ({ ...current, quantidade: ajustarQuantidadeAMedida(event.target.value, editingFood?.medida) }))} className="field" /></Field>{Number.isFinite(disponivelNaEdicao()) && <p className="mt-1 text-xs text-[var(--muted)]">Disponível: {formatQuantity(String(disponivelNaEdicao()))} {editingFood?.medida}</p>}</div>
        <Field label="Data" required><input required type="date" value={editForm.data} onChange={(event) => setEditForm((current) => ({ ...current, data: event.target.value }))} className="field" /></Field>
        <div className="sm:col-span-2"><Field label="Motivo" required><select required value={editForm.motivo} onChange={(event) => setEditForm((current) => ({ ...current, motivo: event.target.value }))} className="field">{motivos.map((motivo) => <option key={motivo.valor} value={motivo.valor}>{motivo.rotulo}</option>)}</select></Field></div>
        <div className="sm:col-span-2"><Field label="Descrição"><input maxLength={300} value={editForm.descricao} onChange={(event) => setEditForm((current) => ({ ...current, descricao: event.target.value }))} className="field" placeholder="Detalhe opcional da baixa" /></Field></div>
        <p className="sm:col-span-2 text-xs text-[var(--muted)]">Ao salvar, a diferença de quantidade é ajustada no saldo do lote.</p>
        {modalError && <p role="alert" className="sm:col-span-2 text-sm text-[var(--danger)]">{modalError}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></div>
      </form></Modal>}

      {deleting && <Modal title="Excluir desperdício" close={() => setDeleting(null)}>
        <p className="text-sm text-[var(--muted-strong)]">Tem certeza que deseja excluir o registro de <strong className="text-[var(--ink)]">{formatQuantity(deleting.quantidade)} {deletingFood?.medida} de {deletingFood?.nome || "alimento não encontrado"}</strong> em {new Date(`${deleting.data}T00:00:00`).toLocaleDateString("pt-BR")}? A quantidade volta para o saldo do lote. Essa ação não pode ser desfeita.</p>
        {modalError && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{modalError}</p>}
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="danger" disabled={saving} onClick={confirmDelete}>{saving ? "Excluindo…" : "Excluir"}</Button></div>
      </Modal>}
    </>
  );
}
