import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Login } from './pages/Login'
import { EsqueciSenha } from './pages/EsqueciSenha'
import { RedefinirSenha } from './pages/RedefinirSenha'
import { AbrirChamado } from './pages/AbrirChamado'
import { PainelManutencao } from './pages/PainelManutencao'
import { ComoUsar } from './pages/ComoUsar'
import { Admin } from './pages/Admin'

/** Relógio de sala de controle — HH:MM:SS tabular. */
function Relogio() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="shell-clock">{agora.toLocaleTimeString('pt-BR')}</span>
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Carregando">
      <div className="splash-logo">PROMA</div>
      <div className="splash-linha" />
    </div>
  )
}

/** Layout autenticado: header + nav por permissão + conteúdo. */
function ShellProtegido() {
  const { usuario, carregando, sair } = useAuth()
  const location = useLocation()

  if (carregando) return <Splash />
  if (!usuario) return <Navigate to="/login" state={{ de: location.pathname }} replace />

  const ativo = ({ isActive }: { isActive: boolean }) => (isActive ? 'ativo' : '')

  return (
    <>
      <header className="shell-header">
        <div className="brand">
          <strong>PROMA</strong>
          <span>Manutenção</span>
        </div>
        <nav className="shell-nav">
          {usuario.perfil.pode_abrir && (
            <NavLink to="/" className={ativo} end>Abrir Chamado</NavLink>
          )}
          <NavLink to="/painel" className={ativo}>Painel Manutenção</NavLink>
          <NavLink to="/ajuda" className={ativo}>Como usar</NavLink>
          {usuario.perfil.pode_administrar && (
            <NavLink to="/admin" className={ativo}>Admin</NavLink>
          )}
        </nav>
        <Relogio />
        <div className="user-chip">
          <span className="user-nome" title={usuario.email}>
            {usuario.nome}
            <small>{usuario.perfil.nome}</small>
          </span>
          <button className="sair" onClick={() => void sair()}>Sair</button>
        </div>
      </header>
      <div className="hazard-strip" aria-hidden="true" />
      <main>
        <Outlet />
      </main>
    </>
  )
}

function RequerPermissao({ permissao, children }: { permissao: 'pode_abrir' | 'pode_atender' | 'pode_administrar'; children: ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario?.perfil[permissao]) return <Navigate to="/painel" replace />
  return <>{children}</>
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route element={<ShellProtegido />}>
          <Route
            path="/"
            element={<RequerPermissao permissao="pode_abrir"><AbrirChamado /></RequerPermissao>}
          />
          <Route path="/painel" element={<PainelManutencao />} />
          <Route path="/ajuda" element={<ComoUsar />} />
          <Route
            path="/admin"
            element={<RequerPermissao permissao="pode_administrar"><Admin /></RequerPermissao>}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
