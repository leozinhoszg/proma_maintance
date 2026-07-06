import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiEsqueciSenha } from '../api'
import { AuthTela } from '../components/AuthTela'

export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    await apiEsqueciSenha(email.trim()).catch(() => undefined)
    setEnviando(false)
    setEnviado(true) // resposta é idêntica exista o e-mail ou não
  }

  return (
    <AuthTela>
      <p className="eyebrow">Recuperação de acesso</p>
      <h1 className="auth-titulo">Esqueci minha senha</h1>

      {enviado ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stamp ok" role="status">
            ✓ Se o e-mail estiver cadastrado, você receberá as instruções em instantes.
          </div>
          <p className="auth-texto">
            Verifique também a caixa de spam. O link vale por tempo limitado.
          </p>
          <Link to="/login" className="auth-link">← Voltar para o login</Link>
        </motion.div>
      ) : (
        <form onSubmit={enviar} className="auth-form">
          <p className="auth-texto">
            Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
          </p>
          <div className="field">
            <span className="fnum">01</span>
            <label>E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@promagroup.com"
                required
                autoFocus
              />
            </label>
          </div>
          <div className="auth-acoes">
            <button className="primario" type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </button>
            <Link to="/login" className="auth-link">Voltar</Link>
          </div>
        </form>
      )}
    </AuthTela>
  )
}
