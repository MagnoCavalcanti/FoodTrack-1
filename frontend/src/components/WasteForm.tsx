import type { FormEvent } from "react";
import { formatQuantity, localDateString } from "../api/formatacao";
import type { FoodItem } from "../api/tipos/alimento";
import type { MotivoDesperdicio } from "../api/tipos/desperdicio";
import type { StockItem } from "../api/tipos/estoque";
import { Icon } from "./Icon";

const QUANTIDADE_MINIMA_BAIXA = 0.01;

/** Formata a quantidade da baixa com até 3 casas, sem zeros à direita. */
function formatarQuantidadeBaixa(valor: number) {
  return valor.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/** Mantém a quantidade digitada entre 0,01 e o saldo do lote, preservando um número incompleto. */
function limitarQuantidadeBaixa(valor: string, maximo: number) {
  const normalizado = valor.replace(",", ".");
  if (normalizado === "" || normalizado === "0" || normalizado === "0.") return normalizado;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return "";
  if (numero > maximo) return formatarQuantidadeBaixa(maximo);
  return normalizado;
}

/** Quantidade inicial do formulário quando o lote comporta a baixa mínima. */
export function quantidadeInicialDaBaixa(saldo: number) {
  return Number.isFinite(saldo) && saldo >= QUANTIDADE_MINIMA_BAIXA ? formatarQuantidadeBaixa(QUANTIDADE_MINIMA_BAIXA) : "";
}

export type FormularioDesperdicio = {
  estoque: string;
  quantidade: string;
  motivo: string;
  descricao: string;
};

type RegistroDesperdicio = {
  motivo: string;
  descricao: string;
  quantidade: string;
  data: string;
  estoque: number;
};

type WasteFormProps = {
  foods: FoodItem[];
  stocks: StockItem[];
  motivos: MotivoDesperdicio[];
  form: FormularioDesperdicio;
  error: string;
  onChange: (form: FormularioDesperdicio) => void;
  onError: (message: string) => void;
  onClose: () => void;
  onSubmit: (data: RegistroDesperdicio) => Promise<void>;
  onSaved: () => void;
};

/** Formulário de baixa, com quantidade entre 0,01 e o saldo do lote. */
export function WasteForm({ foods, stocks, motivos, form, error, onChange, onError, onClose, onSubmit, onSaved }: WasteFormProps) {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError("");
    const saldo = Number(stocks.find((stock) => stock.id === Number(form.estoque))?.quantidade_atual);
    const quantidade = Number(form.quantidade.replace(",", "."));
    if (!Number.isFinite(saldo) || saldo < QUANTIDADE_MINIMA_BAIXA || !Number.isFinite(quantidade) || quantidade < QUANTIDADE_MINIMA_BAIXA || quantidade > saldo) {
      onError("Informe uma quantidade entre 0,01 e o saldo disponível no lote.");
      return;
    }
    try {
      await onSubmit({ motivo: form.motivo, descricao: form.descricao, quantidade: formatarQuantidadeBaixa(quantidade), data: localDateString(), estoque: Number(form.estoque) });
      onSaved();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Não foi possível registrar o desperdício.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="waste-title">
      <form onSubmit={enviar} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="waste-title" className="text-2xl font-bold tracking-tight">Registrar desperdício</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">A quantidade registrada será descontada do lote escolhido.</p></div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-[var(--surface-soft)]" aria-label="Fechar modal"><Icon name="close" /></button>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="field-label">Estoque *</span><select required value={form.estoque} onChange={(event) => {
            const estoque = event.target.value;
            const saldo = Number(stocks.find((stock) => stock.id === Number(estoque))?.quantidade_atual);
            const informada = Number(form.quantidade.replace(",", "."));
            const quantidade = !Number.isFinite(saldo) || saldo < QUANTIDADE_MINIMA_BAIXA
              ? ""
              : !Number.isFinite(informada) || informada < QUANTIDADE_MINIMA_BAIXA
                ? "0.01"
                : limitarQuantidadeBaixa(form.quantidade, saldo);
            onChange({ ...form, estoque, quantidade });
          }} className="field"><option value="">Selecione um alimento e local</option>{stocks.map((stock) => { const food = foodById.get(stock.alimento); return <option key={stock.id} value={stock.id}>{food?.nome || `Alimento ${stock.alimento}`} · {stock.localizacao} ({formatQuantity(stock.quantidade_atual)} {food?.medida || ""})</option>; })}</select></label>
          {(() => {
            const lote = stocks.find((stock) => stock.id === Number(form.estoque));
            const saldo = Number(lote?.quantidade_atual);
            const medida = lote ? foodById.get(lote.alimento)?.medida || "" : "";
            const disponivel = Number.isFinite(saldo) && saldo >= QUANTIDADE_MINIMA_BAIXA;
            const valorRange = disponivel ? Math.min(saldo, Math.max(QUANTIDADE_MINIMA_BAIXA, Number(form.quantidade.replace(",", ".")) || QUANTIDADE_MINIMA_BAIXA)) : QUANTIDADE_MINIMA_BAIXA;
            return <div className="sm:col-span-2"><span className="field-label">Quantidade *</span>{disponivel ? <>
              <input type="range" min={QUANTIDADE_MINIMA_BAIXA} max={saldo} step={QUANTIDADE_MINIMA_BAIXA} value={valorRange} onChange={(event) => onChange({ ...form, quantidade: formatarQuantidadeBaixa(Number(event.target.value)) })} className="h-11 w-full accent-[var(--brand)]" aria-label="Ajustar quantidade no intervalo disponível" />
              <span className="mt-1 flex justify-between text-xs text-[var(--muted)]"><span>0,01 {medida}</span><span>{formatQuantity(lote?.quantidade_atual || "")} {medida}</span></span>
              <input required type="number" min={QUANTIDADE_MINIMA_BAIXA} max={saldo} step={QUANTIDADE_MINIMA_BAIXA} value={form.quantidade} onChange={(event) => onChange({ ...form, quantidade: limitarQuantidadeBaixa(event.target.value, saldo) })} onBlur={() => {
                const numero = Number(form.quantidade.replace(",", "."));
                const ajustada = !Number.isFinite(numero) || numero < QUANTIDADE_MINIMA_BAIXA ? QUANTIDADE_MINIMA_BAIXA : Math.min(saldo, numero);
                onChange({ ...form, quantidade: formatarQuantidadeBaixa(ajustada) });
              }} className="field mt-3" aria-label="Quantidade da baixa" />
            </> : <p className="rounded-xl bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning-ink)]">{lote ? "Este lote não tem saldo suficiente para uma baixa mínima de 0,01." : "Selecione um lote para definir a quantidade entre 0,01 e o saldo disponível."}</p>}</div>;
          })()}
          <label><span className="field-label">Motivo *</span><select required value={form.motivo} onChange={(event) => onChange({ ...form, motivo: event.target.value })} className="field">{motivos.map((motivo) => <option key={motivo.valor} value={motivo.valor}>{motivo.rotulo}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="field-label">Descrição</span><input maxLength={300} value={form.descricao} onChange={(event) => onChange({ ...form, descricao: event.target.value })} className="field" placeholder="Detalhe opcional da baixa" /></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold">Cancelar</button>
          <button type="submit" className="min-h-11 rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white">Confirmar registro</button>
        </div>
      </form>
    </div>
  );
}
