/**
 * Confirmação temporária das operações, anunciada para leitores de tela.
 * Quem controla quando aparece e some é o App.tsx (função notify): ele preenche
 * a mensagem e a apaga depois de 3,2 segundos.
 */
export function Toast({ message }: { message: string }) {
  // Sem mensagem, não desenha nada. Em React, retornar null = não renderizar.
  if (!message) return null;
  // aria-live="polite": leitores de tela leem a mensagem quando ela aparece.
  return <div aria-live="polite" className="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[var(--ink)] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-xl">{message}</div>;
}
