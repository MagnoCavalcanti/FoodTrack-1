import { useState, type FormEvent } from "react";
import type { PageProps } from "./types";
import { Field, FormSection, MiniIcon, PageHeader, PrimaryButton, Review, SecondaryButton } from "./ui";

export default function CreateFoodPage({ navigate, notify, saveFood, user, restaurants }: PageProps) {
  const [submitted, setSubmitted] = useState(false);
  const initialForm = { name: "", category: "", quantity: "", unit: "Kg", validity: "", location: "", restaurant: "" };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Atualiza um campo mantendo os valores já digitados nos demais.
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      // App executa a criação do alimento e, em seguida, do estoque inicial.
      await saveFood({
        nome: form.name,
        categoria: form.category,
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

  if (submitted) return <div className="mx-auto max-w-xl py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"><MiniIcon name="check" size={30} /></span><h1 className="mt-5 text-3xl font-bold">Alimento cadastrado</h1><p className="mt-2 text-[var(--muted-strong)]">{form.name} já está disponível no inventário da unidade.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><SecondaryButton onClick={() => { setSubmitted(false); setForm(initialForm); }}>Cadastrar outro</SecondaryButton><PrimaryButton onClick={() => navigate("Estoque")}>Ver no estoque</PrimaryButton></div></div>;

  return (
    <>
      <PageHeader eyebrow="Entrada de inventário" title="Cadastrar Alimento" description="Registre um novo item com quantidade, validade do estoque e local de armazenamento." />
      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <FormSection title="Informações do alimento" description="Dados de identificação e classificação.">
            <Field label="Nome do alimento" required><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="field" placeholder="Ex.: Filé de peito de frango" /></Field>
            <Field label="Categoria" required><input required maxLength={60} value={form.category} onChange={(e) => update("category", e.target.value)} className="field" placeholder="Ex.: Hortifruti" /></Field>
            {user.is_superuser && <Field label="Restaurante" required><select required value={form.restaurant} onChange={(e) => update("restaurant", e.target.value)} className="field"><option value="">Selecione</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.nome}</option>)}</select></Field>}
          </FormSection>
          <FormSection title="Dados do estoque" description="Controle de quantidade, validade e armazenamento.">
            <Field label="Quantidade inicial" required><input required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className="field" type="number" min="0" step="0.001" placeholder="0,0" /></Field>
            <Field label="Unidade" required><select value={form.unit} onChange={(e) => update("unit", e.target.value)} className="field"><option>Kg</option><option>g</option><option>L</option><option>ml</option><option value="un">Unidade</option><option value="maço">Maço</option><option value="caixa">Caixa</option></select></Field>
            <Field label="Validade do estoque"><input value={form.validity} onChange={(e) => update("validity", e.target.value)} className="field" type="date" /></Field>
            <Field label="Local de armazenamento" required><input required maxLength={150} value={form.location} onChange={(e) => update("location", e.target.value)} className="field" placeholder="Ex.: Câmara fria" /></Field>
          </FormSection>
          {error && <p role="alert" className="rounded-lg bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
        </div>
        <aside className="sticky top-24 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="font-bold">Resumo do cadastro</h2>
          <div className="mt-5 space-y-4 text-sm"><Review label="Alimento" value={form.name || "Não informado"} /><Review label="Categoria" value={form.category || "Não informada"} /><Review label="Quantidade" value={form.quantity ? `${form.quantity} ${form.unit}` : "Não informada"} /><Review label="Validade do estoque" value={form.validity ? new Date(`${form.validity}T12:00`).toLocaleDateString("pt-BR") : "Não informada"} /><Review label="Local" value={form.location || "Não informado"} /></div>
          <p className="mt-5 rounded-xl bg-[var(--brand-soft)] p-3 text-xs leading-relaxed text-[var(--brand-dark)]">Os alertas de validade serão calculados automaticamente após o cadastro.</p>
          <button disabled={saving} type="submit" className="mt-5 min-h-11 w-full rounded-xl bg-[var(--brand)] font-bold text-white disabled:opacity-60">{saving ? "Salvando…" : "Cadastrar alimento e estoque"}</button>
          <button type="button" onClick={() => navigate("Estoque")} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-[var(--muted-strong)]">Cancelar</button>
        </aside>
      </form>
    </>
  );
}
