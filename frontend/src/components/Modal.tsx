import type { ReactNode } from "react";

/**
 * Janela sobreposta com título e botão de fechar.
 * Uso: {aberto && <Modal title="..." close={() => setAberto(false)}>conteúdo</Modal>}
 * O modal não guarda se está aberto: quem usa decide se ele aparece ou não.
 */
export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return (
    // Fundo escuro e desfocado cobrindo a tela inteira (fixed inset-0).
    // role="dialog" e aria-modal avisam leitores de tela que é uma janela.
    <div className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      {/* Caixa branca centralizada */}
      <div className="my-6 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={close} className="grid size-11 place-items-center rounded-xl bg-[var(--surface-soft)]" aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
