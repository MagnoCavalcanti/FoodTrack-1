import type { FormEvent } from "react";
import { formatQuantity, localDateString, medidaInteira, passoDaMedida } from "../api/formatacao";
import type { FoodItem } from "../api/tipos/alimento";
import type { MotivoDesperdicio } from "../api/tipos/desperdicio";
import type { StockItem } from "../api/tipos/estoque";
import { Icon } from "./Icon";
import { Button } from "./Button";

/** Formata a quantidade da baixa com até 3 casas, sem zeros à direita. */
function formatarQuantidadeBaixa(valor: number) {
  return valor.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/** Maior baixa possível: o saldo do lote, arredondado para baixo quando a medida é inteira. */
function maximoDaBaixa(saldo: number, inteira: boolean) {
  return inteira ? Math.floor(saldo) : saldo;
}

/** Mantém a quantidade digitada até o máximo do lote, preservando um número incompleto. */
function limitarQuantidadeBaixa(valor: string, maximo: number, inteira: boolean) {
  let normalizado = valor.replace(",", ".");
  // Em itens contados, descarta a parte decimal digitada.
  if (inteira) normalizado = normalizado.replace(/\..*$/, "");
  if (normalizado === "" || normalizado === "0" || normalizado === "0.") return normalizado;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return "";
  if (numero > maximo) return formatarQuantidadeBaixa(maximo);
  return normalizado;
}

/** Quantidade inicial do formulário quando o lote comporta a baixa mínima da medida. */
export function quantidadeInicialDaBaixa(saldo: number, medida?: string) {
  const minimo = passoDaMedida(medida);
  return Number.isFinite(saldo) && saldo >= minimo ? formatarQuantidadeBaixa(minimo) : "";
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

/** Formulário de baixa. Peso e volume vão de 0,01 em 0,01; unidade, maço e caixa vão de 1 em 1. */
export function WasteForm({ foods, stocks, motivos, form, error, onChange, onError, onClose, onSubmit, onSaved }: WasteFormProps) {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  // Reúne saldo, medida e limites do lote escolhido.
  const dadosDoLote = (estoque: string) => {
    const lote = stocks.find((stock) => stock.id === Number(estoque));
    const medida = lote ? foodById.get(lote.alimento)?.medida || "" : "";
    const inteira = medidaInteira(medida);
    const minimo = passoDaMedida(medida);
    const saldo = Number(lote?.quantidade_atual);
    const maximo = maximoDaBaixa(saldo, inteira);
    const disponivel = Number.isFinite(maximo) && maximo >= minimo;
    return { lote, medida, inteira, minimo, maximo, disponivel };
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError("");
    const { inteira, minimo, maximo, disponivel } = dadosDoLote(form.estoque);
    const quantidade = Number(form.quantidade.replace(",", "."));
    if (!disponivel || !Number.isFinite(quantidade) || quantidade < minimo || quantidade > maximo || (inteira && !Number.isInteger(quantidade))) {
      onError(inteira
        ? "Informe uma quantidade inteira entre 1 e o saldo disponível no lote."
        : "Informe uma quantidade entre 0,01 e o saldo disponível no lote.");
      return;
    }
    try {
      await onSubmit({ motivo: form.motivo, descricao: form.descricao, quantidade: formatarQuantidadeBaixa(quantidade), data: localDateString(), estoque: Number(form.estoque) });
      onSaved();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Não foi possível registrar o desperdício.");
    }
  };

  const { lote, medida, inteira, minimo, maximo, disponivel } = dadosDoLote(form.estoque);
  const minimoTexto = inteira ? "1" : "0,01";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="waste-title">
      <form onSubmit={enviar} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
          <div><h2 id="waste-title" className="text-2xl font-bold tracking-tight">Registrar desperdício</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">A quantidade registrada será descontada do lote escolhido.</p></div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-[var(--surface-soft)]" aria-label="Fechar modal"><Icon name="close" /></button>
        </div>
        {/* Só os campos rolam; título e botões ficam sempre visíveis em telas baixas. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="field-label">Estoque *</span><select required value={form.estoque} onChange={(event) => {
            const estoque = event.target.value;
            const novo = dadosDoLote(estoque);
            const informada = Number(form.quantidade.replace(",", "."));
            const quantidade = !novo.disponivel
              ? ""
              : !Number.isFinite(informada) || informada < novo.minimo
                ? formatarQuantidadeBaixa(novo.minimo)
                : limitarQuantidadeBaixa(form.quantidade, novo.maximo, novo.inteira);
            onChange({ ...form, estoque, quantidade });
          }} className="field"><option value="">Selecione um alimento e local</option>{stocks.map((stock) => { const food = foodById.get(stock.alimento); return <option key={stock.id} value={stock.id}>{food?.nome || `Alimento ${stock.alimento}`} · {stock.localizacao} ({formatQuantity(stock.quantidade_atual)} {food?.medida || ""})</option>; })}</select></label>
          {(() => {
            const valorRange = disponivel ? Math.min(maximo, Math.max(minimo, Number(form.quantidade.replace(",", ".")) || minimo)) : minimo;
            return <div className="sm:col-span-2"><span className="field-label">Quantidade *</span>{disponivel ? <>
              <input type="range" min={minimo} max={maximo} step={minimo} value={valorRange} onChange={(event) => onChange({ ...form, quantidade: formatarQuantidadeBaixa(Number(event.target.value)) })} className="h-11 w-full accent-[var(--brand)]" aria-label="Ajustar quantidade no intervalo disponível" />
              <span className="mt-1 flex justify-between text-xs text-[var(--muted)]"><span>{minimoTexto} {medida}</span><span>{formatQuantity(String(maximo))} {medida}</span></span>
              <input required type="number" min={minimo} max={maximo} step={minimo} value={form.quantidade} onChange={(event) => onChange({ ...form, quantidade: limitarQuantidadeBaixa(event.target.value, maximo, inteira) })} onBlur={() => {
                const numero = Number(form.quantidade.replace(",", "."));
                const base = inteira ? Math.round(numero) : numero;
                const ajustada = !Number.isFinite(base) || base < minimo ? minimo : Math.min(maximo, base);
                onChange({ ...form, quantidade: formatarQuantidadeBaixa(ajustada) });
              }} className="field mt-3" aria-label="Quantidade da baixa" />
            </> : <p className="rounded-xl bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning-ink)]">{lote ? `Este lote não tem saldo suficiente para uma baixa mínima de ${minimoTexto} ${medida}.` : "Selecione um lote para definir a quantidade da baixa."}</p>}</div>;
          })()}
          <label><span className="field-label">Motivo *</span><select required value={form.motivo} onChange={(event) => onChange({ ...form, motivo: event.target.value })} className="field">{motivos.map((motivo) => <option key={motivo.valor} value={motivo.valor}>{motivo.rotulo}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="field-label">Descrição</span><input maxLength={300} value={form.descricao} onChange={(event) => onChange({ ...form, descricao: event.target.value })} className="field" placeholder="Detalhe opcional da baixa" /></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--line)] px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Confirmar registro</Button>
        </div>
      </form>
    </div>
  );
}
