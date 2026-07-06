import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { AuthTela } from '../components/AuthTela'

const item = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

export function Login() {
  const { usuario, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) {
    const destino = (location.state as { de?: string } | null)?.de ?? '/'
    return <Navigate to={destino} replace />
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const msg = await entrar(email.trim(), senha)
    setEnviando(false)
    if (msg) {
      setErro(msg)
      return
    }
    const destino = (location.state as { de?: string } | null)?.de ?? '/'
    navigate(destino, { replace: true })
  }

  return (
    <AuthTela>
      <motion.p className="eyebrow" {...item} transition={{ delay: 0.25 }}>
        Acesso · Sala de controle
      </motion.p>
      <motion.h1 className="auth-titulo" {...item} transition={{ delay: 0.3 }}>
        Entrar
      </motion.h1>

      {erro && (
        <motion.div
          className="stamp erro"
          role="alert"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          ✕ {erro}
        </motion.div>
      )}

      <form onSubmit={enviar} className="auth-form">
        <motion.div className="field" {...item} transition={{ delay: 0.36 }}>
          <span className="fnum">01</span>
          <label>E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@promagroup.com"
              autoComplete="username"
              required
              autoFocus
            />
          </label>
        </motion.div>

        <motion.div className="field" {...item} transition={{ delay: 0.42 }}>
          <span className="fnum">02</span>
          <label>Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
        </motion.div>

        <motion.div className="auth-acoes" {...item} transition={{ delay: 0.48 }}>
          <button className="primario" type="submit" disabled={enviando}>
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
          <Link to="/esqueci-senha" className="auth-link">Esqueci minha senha</Link>
        </motion.div>
      </form>
    </AuthTela>
  )
}
