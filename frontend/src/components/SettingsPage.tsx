import { useEffect, useState, type FormEvent } from "react";
import { mascararCnpj, rotuloDe } from "../api/formatacao";
import { getRestaurantSettings } from "../api/restaurantes";
import { PERFIS, ROTULOS_PERFIL } from "../api/tipos/usuario";
import type { PageProps } from "./types";
import { Field } from "./Field";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";
import { SettingsHeading } from "./SettingsHeading";
import { Button } from "./Button";

export default function SettingsPage({ notify, user, users, restaurants, token, saveUser, saveRestaurant, saveRestaurantSettings }: PageProps) {
  const [tab, setTab] = useState("Restaurante");
  const [memberModal, setMemberModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(user.restaurante || restaurants[0]?.id || 0);
  const restaurant = restaurants.find((item) => item.id === restaurantId);
  const podeAlterarAlerta = user.is_superuser || user.perfil === "proprietario" || user.perfil === "gerente";
  const [restaurantForm, setRestaurantForm] = useState({ nome: restaurant?.nome || "", cnpj: restaurant?.cnpj || "", dias_alerta_validade: restaurant?.dias_alerta_validade ?? 3 });
  const [memberForm, setMemberForm] = useState({ nome: "", username: "", email: "", perfil: "funcionario", password: "", restaurante: String(user.restaurante || "") });
  const tabs = [["Restaurante", "Dados disponíveis na API"], ["Equipe", "Contas do restaurante"]];

  // Os dias exibidos vêm da configuração do restaurante, não só da lista geral.
  useEffect(() => {
    if (!restaurantId) return;
    let ativo = true;
    getRestaurantSettings(token, user.is_superuser ? restaurantId : undefined)
      .then((config) => {
        if (!ativo) return;
        setRestaurantForm((current) => ({
          ...current,
          nome: config.nome,
          dias_alerta_validade: config.dias_alerta_validade,
        }));
      })
      .catch((caught: unknown) => {
        if (ativo) setError(caught instanceof Error ? caught.message : "Não foi possível ler a configuração do restaurante.");
      });
    return () => { ativo = false; };
  }, [restaurantId, token, user.is_superuser]);

  // Superusuário grava o restaurante inteiro. Proprietário e gerente gravam só o prazo de alerta.
  const submitRestaurant = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurant || !podeAlterarAlerta) return;
    setSaving(true);
    setError("");
    try {
      if (user.is_superuser) {
        await saveRestaurant(restaurant.id, restaurantForm);
        notify("Dados do restaurante atualizados.");
      } else {
        const atualizado = await saveRestaurantSettings(restaurantForm.dias_alerta_validade);
        setRestaurantForm((current) => ({ ...current, dias_alerta_validade: atualizado.dias_alerta_validade }));
        notify("Prazo de alerta atualizado.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o restaurante.");
    } finally {
      setSaving(false);
    }
  };

  const submitMember = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Usuário comum herda o restaurante atual; superusuário pode indicar um restaurante.
      await saveUser({
        nome: memberForm.nome,
        username: memberForm.username,
        email: memberForm.email,
        perfil: memberForm.perfil,
        password: memberForm.password,
        ...(user.is_superuser ? { restaurante: Number(memberForm.restaurante) } : {}),
      });
      setMemberModal(false);
      setMemberForm({ nome: "", username: "", email: "", perfil: "funcionario", password: "", restaurante: String(user.restaurante || "") });
      notify("Conta criada.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar a conta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administração" title="Configurações" description="Dados de restaurante e equipe disponibilizados pelo backend." />
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[var(--shadow)]">
          <p className="px-3 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Dados da conta</p>
          {tabs.map(([item, description]) => <button key={item} onClick={() => setTab(item)} className={`mb-1 min-h-[62px] w-full rounded-xl px-3 text-left transition ${tab === item ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"}`}><strong className="block text-sm">{item}</strong><span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{description}</span></button>)}
          <div className="mx-2 mt-3 border-t border-[var(--line)] px-1 py-4"><strong className="block text-sm">{user.nome}</strong><span className="text-xs text-[var(--muted)]">{rotuloDe(ROTULOS_PERFIL, user.perfil)}</span></div>
        </aside>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-7">
          {tab === "Restaurante" && <>
            <SettingsHeading title="Restaurante" description="Nome e CNPJ vêm do restaurante. O prazo de alerta vem da configuração." />
            {user.is_superuser && <Field label="Selecionar restaurante" required><select required value={restaurantId} onChange={(event) => { const id = Number(event.target.value); setRestaurantId(id); const selectedRestaurant = restaurants.find((item) => item.id === id); if (selectedRestaurant) setRestaurantForm({ nome: selectedRestaurant.nome, cnpj: selectedRestaurant.cnpj, dias_alerta_validade: selectedRestaurant.dias_alerta_validade }); }} className="field mt-5">{restaurants.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>}
            {restaurant ? <form onSubmit={submitRestaurant} className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Nome" required><input required maxLength={150} readOnly={!user.is_superuser} value={restaurantForm.nome} onChange={(event) => setRestaurantForm((current) => ({ ...current, nome: event.target.value }))} className="field read-only:opacity-70" /></Field>
              <Field label="CNPJ" required><input required inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" readOnly={!user.is_superuser} value={restaurantForm.cnpj} onChange={(event) => setRestaurantForm((current) => ({ ...current, cnpj: mascararCnpj(event.target.value) }))} className="field read-only:opacity-70" /></Field>
              <Field label="Dias de alerta de validade" required><input required type="number" min={0} max={365} readOnly={!podeAlterarAlerta} value={restaurantForm.dias_alerta_validade} onChange={(event) => setRestaurantForm((current) => ({ ...current, dias_alerta_validade: Number(event.target.value) }))} className="field read-only:opacity-70" /></Field>
              {podeAlterarAlerta && <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : user.is_superuser ? "Salvar restaurante" : "Salvar prazo de alerta"}</Button></div>}
            </form> : <p className="mt-6 text-sm text-[var(--muted-strong)]">Esta conta de superusuário não está vinculada a um restaurante específico.</p>}
            {user.is_superuser && <p className="mt-4 text-sm text-[var(--muted-strong)]">Nome, CNPJ e prazo de alerta são gravados no restaurante selecionado.</p>}
            {!user.is_superuser && podeAlterarAlerta && <p className="mt-4 text-sm text-[var(--muted-strong)]">Você pode alterar o prazo de alerta do seu restaurante. Nome e CNPJ ficam com o superusuário.</p>}
            {!podeAlterarAlerta && <p className="mt-4 text-sm text-[var(--muted-strong)]">Somente proprietário, gerente ou superusuário pode alterar o prazo de alerta.</p>}
            <p className="mt-6 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)]">Telefone, endereço e moeda não existem no modelo.</p>
          </>}
          {tab === "Equipe" && <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><SettingsHeading title="Usuários" description={`${users.length} contas retornadas pela API.`} /><Button onClick={() => { setError(""); setMemberModal(true); }} icon="plus">Criar usuário</Button></div>
            <div className="mt-6 space-y-3">{users.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-xs font-bold">{member.nome.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{member.nome}</strong><span className="text-xs text-[var(--muted)]">{member.username} · {member.email}</span></div><span className="text-sm font-semibold text-[var(--brand-dark)]">{rotuloDe(ROTULOS_PERFIL, member.perfil)}</span></div>)}</div>
            <p className="mt-5 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)]">A API permite criar contas, mas não oferece convites por e-mail nem edição/exclusão de usuários pelo fluxo desta tela.</p>
          </>}
          {error && <p role="alert" className="mt-5 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        </section>
      </div>
      {memberModal && <Modal title="Criar usuário" close={() => setMemberModal(false)}><form onSubmit={submitMember} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" required><input required maxLength={150} value={memberForm.nome} onChange={(event) => setMemberForm((current) => ({ ...current, nome: event.target.value }))} className="field" /></Field>
        <Field label="Usuário" required><input required maxLength={150} value={memberForm.username} onChange={(event) => setMemberForm((current) => ({ ...current, username: event.target.value }))} className="field" /></Field>
        <Field label="E-mail" required><input required type="email" value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} className="field" /></Field>
        <Field label="Perfil" required><select required value={memberForm.perfil} onChange={(event) => setMemberForm((current) => ({ ...current, perfil: event.target.value }))} className="field">{PERFIS.map((perfil) => <option key={perfil.value} value={perfil.value}>{perfil.label}</option>)}</select></Field>
        <Field label="Senha inicial" required><input required minLength={8} type="password" value={memberForm.password} onChange={(event) => setMemberForm((current) => ({ ...current, password: event.target.value }))} className="field" /></Field>
        {user.is_superuser && <Field label="Restaurante" required><select required value={memberForm.restaurante} onChange={(event) => setMemberForm((current) => ({ ...current, restaurante: event.target.value }))} className="field"><option value="">Selecione</option>{restaurants.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>}
        {error && <p role="alert" className="sm:col-span-2 text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setMemberModal(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Criando…" : "Criar usuário"}</Button></div>
      </form></Modal>}
    </>
  );
}
