import type { FormEvent } from "react";
import foodTrackLogo from "../assets/foodtrack-logo.png"; // o Vite transforma a imagem num endereço
import { Button } from "./Button";

type LoginPageProps = {
  username: string;
  password: string;
  loginError: string; // erro do login (senha errada etc.)
  loadError: string;  // erro vindo do carregamento (ex.: "Sua sessão expirou")
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Tela de login.
 * A página é só visual: os valores dos campos e a função de entrar vêm do
 * App.tsx por props. Isso se chama "componente controlado pelo pai".
 */
export default function LoginPage({ username, password, loginError, loadError, onUsernameChange, onPasswordChange, onSubmit }: LoginPageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4">
      {/* Apertar Enter ou clicar em "Entrar" (type="submit") dispara onSubmit */}
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
        <img src={foodTrackLogo} alt="FoodTrack" className="mx-auto mb-6 h-24 w-48 object-contain" />
        <h1 className="text-2xl font-bold">Entrar no FoodTrack</h1>
        <p className="mt-2 text-sm text-[var(--muted-strong)]">Use suas credenciais do sistema para acessar os dados do restaurante.</p>
        {/* Campo controlado: value vem do estado; cada tecla chama onChange, que atualiza o estado */}
        <label className="mt-6 block"><span className="field-label">Usuário</span><input autoComplete="username" required value={username} onChange={(event) => onUsernameChange(event.target.value)} className="field" /></label>
        <label className="mt-4 block"><span className="field-label">Senha</span><input autoComplete="current-password" required type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} className="field" /></label>
        {/* Mostra o primeiro erro que existir */}
        {(loginError || loadError) && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{loginError || loadError}</p>}
        <Button type="submit" fullWidth className="mt-6">Entrar</Button>
      </form>
    </main>
  );
}
