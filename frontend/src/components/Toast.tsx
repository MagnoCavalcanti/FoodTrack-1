/** Confirmação temporária das operações, anunciada para leitores de tela. */
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div aria-live="polite" className="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[var(--ink)] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-xl">{message}</div>;
}
