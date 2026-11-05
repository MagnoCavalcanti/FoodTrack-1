import { useState, type FormEvent } from "react";
import { mascararCnpj, PERFIS, ROTULOS_PERFIL, rotuloDe } from "../api";
import type { PageProps } from "./types";
import { Field, Modal, PageHeader, PrimaryButton, SecondaryButton, SettingsHeading } from "./ui";

export default function SettingsPage({ notify, user, users, restaurants, saveUser, saveRestaurant }: PageProps) {
  const [tab, setTab] = useState("Restaurante");
  const [memberModal, setMemberModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState(user.restaurante || restaurants[0]?.id || 0);
  const restaurant = restaurants.find((item) => item.id === restaurantId);
  const [restaurantForm, setRestaurantForm] = useState({ nome: restaurant?.nome || "", cnpj: restaurant?.cnpj || "", dias_alerta_validade: restaurant?.dias_alerta_validade ?? 3 });
  const [memberForm, setMemberForm] = useState({ nome: "", username: "", email: "", perfil: "funcionario", password: "", restaurante: String(user.restaurante || "") });
  const tabs = [["Restaurante", "Dados disponíveis na API"], ["Equipe", "Contas do restaurante"]];

  // A edição dos dados do restaurante é reservada ao superusuário também no backend.
  const submitRestaurant = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurant || !user.is_superuser) return;
    setSaving(true);
    setError("");
    try {
      await saveRestaurant(restaurant.id, restaurantForm);
      notify("Dados do restaurante atualizados.");
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
            <SettingsHeading title="Restaurante" description="Campos de nome e CNPJ lidos do registro associado à sua conta." />
            {user.is_superuser && <Field label="Selecionar restaurante" required><select required value={restaurantId} onChange={(event) => { const id = Number(event.target.value); setRestaurantId(id); const selectedRestaurant = restaurants.find((item) => item.id === id); if (selectedRestaurant) setRestaurantForm({ nome: selectedRestaurant.nome, cnpj: selectedRestaurant.cnpj, dias_alerta_validade: selectedRestaurant.dias_alerta_validade }); }} className="field mt-5">{restaurants.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>}
            {restaurant ? <form onSubmit={submitRestaurant} className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Nome" required><input required maxLength={150} readOnly={!user.is_superuser} value={restaurantForm.nome} onChange={(event) => setRestaurantForm((current) => ({ ...current, nome: event.target.value }))} className="field read-only:opacity-70" /></Field>
              <Field label="CNPJ" required><input required inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" readOnly={!user.is_superuser} value={restaurantForm.cnpj} onChange={(event) => setRestaurantForm((current) => ({ ...current, cnpj: mascararCnpj(event.target.value) }))} className="field read-only:opacity-70" /></Field>
              <Field label="Dias de alerta de validade" required><input required type="number" min={0} max={365} readOnly={!user.is_superuser} value={restaurantForm.dias_alerta_validade} onChange={(event) => setRestaurantForm((current) => ({ ...current, dias_alerta_validade: Number(event.target.value) }))} className="field read-only:opacity-70" /></Field>
              {user.is_superuser && <div className="sm:col-span-2"><PrimaryButton type="submit">{saving ? "Salvando…" : "Salvar restaurante"}</PrimaryButton></div>}
            </form> : <p className="mt-6 text-sm text-[var(--muted-strong)]">Esta conta de superusuário não está vinculada a um restaurante específico.</p>}
            {!user.is_superuser && <p className="mt-4 text-sm text-[var(--muted-strong)]">Somente superusuários podem alterar os dados do restaurante.</p>}
            <p className="mt-6 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)]">Telefone, endereço e moeda não existem no modelo.</p>
          </>}
          {tab === "Equipe" && <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><SettingsHeading title="Usuários" description={`${users.length} contas retornadas pela API.`} /><PrimaryButton onClick={() => { setError(""); setMemberModal(true); }} icon="plus">Criar usuário</PrimaryButton></div>
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
        <div className="flex justify-end gap-3 sm:col-span-2"><SecondaryButton onClick={() => setMemberModal(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit">{saving ? "Criando…" : "Criar usuário"}</PrimaryButton></div>
      </form></Modal>}
    </>
  );
}
