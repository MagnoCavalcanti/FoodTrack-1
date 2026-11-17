/**
 * Ponto de entrada do React.
 * O index.html tem um <div id="root"></div> vazio; aqui o React assume esse
 * div e desenha o componente <App /> dentro dele.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // estilos globais + Tailwind

// O "!" diz ao TypeScript: "confie, esse elemento existe no HTML".
ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode só age em desenvolvimento: roda efeitos duas vezes para
  // revelar bugs (por isso os useEffect do App têm cancelamento).
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
