import { useMemo, useState, type FormEvent } from "react";
import { ajustarQuantidadeAMedida, medidaInteira } from "../api/formatacao";
import { CATEGORIAS_ALIMENTO } from "../api/tipos/alimento";
import type { PageProps } from "./types";
import { Field } from "./Field";
import { FormSection } from "./FormSection";
import { MiniIcon } from "./MiniIcon";
import { PageHeader } from "./PageHeader";
import { Review } from "./Review";
import { Button } from "./Button";

/** Opção que libera o campo para digitar uma categoria nova. */
const OUTRA_CATEGORIA = "Outros";

export default function CreateFoodPage({ navigate, notify, saveFood, user, restaurants, foods }: PageProps) {
  const [submitted, setSubmitted] = useState(false);
  const initialForm = { name: "", category: "", newCategory: "", quantity: "", unit: "Kg", validity: "", location: "", restaurant: "" };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Lista fixa + categorias já usadas em alimentos do restaurante, para que uma
  // categoria nova cadastrada por "Outros" apareça como opção nos próximos cadastros.
  const categorias = useMemo(() => {
    const fixas = CATEGORIAS_ALIMENTO.filter((categoria) => categoria !== OUTRA_CATEGORIA);
    const conhecidas = new Set(fixas.map((categoria) => categoria.toLocaleLowerCase("pt-BR")));
    const cadastradas = [...new Set(foods.map((food) => food.categoria.trim()))]
      .filter((categoria) => categoria && !conhecidas.has(categoria.toLocaleLowerCase("pt-BR")) && categoria.toLocaleLowerCase("pt-BR") !== OUTRA_CATEGORIA.toLocaleLowerCase("pt-BR"))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [...fixas, ...cadastradas];
  }, [foods]);
  const outraCategoria = form.category === OUTRA_CATEGORIA;
  // Categoria que vai para a API: a digitada em "Outros" ou a escolhida na lista.
  const categoriaFinal = outraCategoria ? form.newCategory.trim() : form.category;

  // Atualiza um campo mantendo os valores já digitados nos demais.
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!categoriaFinal) {
      setError("Digite o nome da nova categoria.");
      setSaving(false);
      return;
    }
    try {
      // App executa a criação do alimento e, em seguida, do estoque inicial.
      await saveFood({
        nome: form.name,
        categoria: categoriaFinal,
        medida: form.unit,
        quantidade: form.quantity,
        validade: form.validity,
        localizacao: form.location,
        ...(user.is_superuser ? { restaurante: Number(form.restaurant) } : {}),
      });
      setSubmitted(true);
      notify("Alimento e estoque cadastrados.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar o alimento.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) return <div className="mx-auto max-w-xl py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"><MiniIcon name="check" size={30} /></span><h1 className="mt-5 text-3xl font-bold">Alimento cadastrado</h1><p className="mt-2 text-[var(--muted-strong)]">{form.name} já está disponível no inventário da unidade.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="secondary" onClick={() => { setSubmitted(false); setForm(initialForm); }}>Cadastrar outro</Button><Button onClick={() => navigate("Estoque")}>Ver no estoque</Button></div></div>;

  return (
    <>
      <PageHeader eyebrow="Entrada de inventário" title="Cadastrar Alimento" description="Registre um novo item com quantidade, validade do estoque e local de armazenamento." />
      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <FormSection title="Informações do alimento" description="Dados de identificação e classificação.">
            <Field label="Nome do alimento" required><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="field" placeholder="Ex.: Filé de peito de frango" /></Field>
            <Field label="Categoria" required><select required value={form.category} onChange={(e) => update("category", e.target.value)} className="field"><option value="">Selecione</option>{categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}<option value={OUTRA_CATEGORIA}>Outros (digitar nova)</option></select></Field>
            {outraCategoria && <Field label="Nova categoria" required><input required autoFocus maxLength={60} value={form.newCategory} onChange={(e) => update("newCategory", e.target.value)} className="field" placeholder="Ex.: Doces e sobremesas" /></Field>}
            {user.is_superuser && <Field label="Restaurante" required><select required value={form.restaurant} onChange={(e) => update("restaurant", e.target.value)} className="field"><option value="">Selecione</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.nome}</option>)}</select></Field>}
          </FormSection>
          <FormSection title="Dados do estoque" description="Controle de quantidade, validade e armazenamento.">
            <Field label="Quantidade inicial" required><input required value={form.quantity} onChange={(e) => update("quantity", ajustarQuantidadeAMedida(e.target.value, form.unit))} className="field" type="number" min="0" step={medidaInteira(form.unit) ? 1 : "any"} placeholder={medidaInteira(form.unit) ? "0" : "0,0"} /></Field>
            <Field label="Unidade" required><select value={form.unit} onChange={(e) => { const unit = e.target.value; setForm((current) => ({ ...current, unit, quantity: ajustarQuantidadeAMedida(current.quantity, unit) })); }} className="field"><option>Kg</option><option>g</option><option>L</option><option>ml</option><option value="un">Unidade</option><option value="maço">Maço</option><option value="caixa">Caixa</option></select></Field>
            <Field label="Validade do estoque"><input value={form.validity} onChange={(e) => update("validity", e.target.value)} className="field" type="date" /></Field>
            <Field label="Local de armazenamento" required><input required maxLength={150} value={form.location} onChange={(e) => update("location", e.target.value)} className="field" placeholder="Ex.: Câmara fria" /></Field>
          </FormSection>
          {error && <p role="alert" className="rounded-lg bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
        </div>
        <aside className="sticky top-24 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="font-bold">Resumo do cadastro</h2>
          <div className="mt-5 space-y-4 text-sm"><Review label="Alimento" value={form.name || "Não informado"} /><Review label="Categoria" value={categoriaFinal || "Não informada"} /><Review label="Quantidade" value={form.quantity ? `${form.quantity} ${form.unit}` : "Não informada"} /><Review label="Validade do estoque" value={form.validity ? new Date(`${form.validity}T12:00`).toLocaleDateString("pt-BR") : "Não informada"} /><Review label="Local" value={form.location || "Não informado"} /></div>
          <p className="mt-5 rounded-xl bg-[var(--brand-soft)] p-3 text-xs leading-relaxed text-[var(--brand-dark)]">Os alertas de validade serão calculados automaticamente após o cadastro.</p>
          <Button type="submit" disabled={saving} fullWidth className="mt-5">{saving ? "Salvando…" : "Cadastrar alimento e estoque"}</Button>
          <Button variant="secondary" onClick={() => navigate("Estoque")} fullWidth className="mt-2">Cancelar</Button>
        </aside>
      </form>
    </>
  );
}
