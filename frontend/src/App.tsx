import { NavLink, Route, Routes } from 'react-router-dom'
import { AbrirChamado } from './pages/AbrirChamado'
import { PainelManutencao } from './pages/PainelManutencao'

export function App() {
  return (
    <>
      <nav>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'ativo' : '')} end>
          Abrir Chamado
        </NavLink>
        <NavLink to="/painel" className={({ isActive }) => (isActive ? 'ativo' : '')}>
          Painel Manutenção
        </NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<AbrirChamado />} />
          <Route path="/painel" element={<PainelManutencao />} />
        </Routes>
      </main>
    </>
  )
}
