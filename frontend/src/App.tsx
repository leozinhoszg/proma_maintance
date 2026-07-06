import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { AbrirChamado } from './pages/AbrirChamado'
import { PainelManutencao } from './pages/PainelManutencao'
import { ComoUsar } from './pages/ComoUsar'

/** Relógio de sala de controle — HH:MM:SS tabular. */
function Relogio() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="shell-clock">{agora.toLocaleTimeString('pt-BR')}</span>
}

export function App() {
  return (
    <>
      <header className="shell-header">
        <div className="brand">
          <strong>PROMA</strong>
          <span>Manutenção</span>
        </div>
        <nav className="shell-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'ativo' : '')} end>
            Abrir Chamado
          </NavLink>
          <NavLink to="/painel" className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Painel Manutenção
          </NavLink>
          <NavLink to="/ajuda" className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Como usar
          </NavLink>
        </nav>
        <Relogio />
      </header>
      <div className="hazard-strip" aria-hidden="true" />
      <main>
        <Routes>
          <Route path="/" element={<AbrirChamado />} />
          <Route path="/painel" element={<PainelManutencao />} />
          <Route path="/ajuda" element={<ComoUsar />} />
        </Routes>
      </main>
    </>
  )
}
