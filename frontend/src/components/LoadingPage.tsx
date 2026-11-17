import { Button } from "./Button";

type LoadingPageProps = {
  loading: boolean;   // true enquanto as requisições iniciais estão em andamento
  loadError: string;  // mensagem de erro, se o carregamento falhou
  onLogout: () => void;
};

/**
 * Mostra o estado da sessão durante o carregamento ou quando ele falha.
 * O App exibe esta tela logo após o login, até todos os dados chegarem.
 */
export default function LoadingPage({ loading, loadError, onLogout }: LoadingPageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] p-6">
      <section className="max-w-xl rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
        {/* O título muda conforme o estado: carregando ou falhou */}
        <h1 className="text-xl font-bold">{loading ? "Carregando dados do restaurante…" : "Não foi possível abrir sua conta"}</h1>
        {loadError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{loadError}</p>}
        {/* Só oferece voltar ao login quando parou de carregar (ou seja, deu erro) */}
        {!loading && <Button onClick={onLogout} className="mt-5">Voltar ao login</Button>}
      </section>
    </main>
  );
}
