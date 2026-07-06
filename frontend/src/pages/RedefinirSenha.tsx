import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiRedefinirSenha } from '../api'
import { AuthTela } from '../components/AuthTela'

/** Atende o reset de senha e o aceite de convite (?convite=1) — mesmo token. */
export function RedefinirSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const ehConvite = params.get('convite') === '1'

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (senha !== confirmar) {
      setErro('as senhas não conferem')
      return
    }
    setEnviando(true)
    try {
      await apiRedefinirSenha(token, senha)
      setSucesso(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthTela>
      <p className="eyebrow">{ehConvite ? 'Bem-vindo · Primeira senha' : 'Recuperação de acesso'}</p>
      <h1 className="auth-titulo">{ehConvite ? 'Definir senha' : 'Redefinir senha'}</h1>

      {!token && (
        <div className="stamp erro" role="alert">
          ✕ Link inválido — solicite um novo em “Esqueci minha senha”.
        </div>
      )}

      {sucesso ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stamp ok" role="status">
            ✓ Senha {ehConvite ? 'definida' : 'redefinida'} com sucesso. Indo para o login…
          </div>
          <Link to="/login" className="auth-link">Ir agora →</Link>
        </motion.div>
      ) : (
        <form onSubmit={enviar} className="auth-form">
          {ehConvite && (
            <p className="auth-texto">
              Sua conta foi criada pelo administrador. Escolha sua senha para começar.
            </p>
          )}
          {erro && <div className="stamp erro" role="alert">✕ {erro}</div>}
          <div className="field">
            <span className="fnum">01</span>
            <label>Nova senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 8 caracteres"
                autoComplete="new-password"
                required
                autoFocus
              />
            </label>
          </div>
          <div className="field">
            <span className="fnum">02</span>
            <label>Confirmar senha
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="repita a senha"
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          <div className="auth-acoes">
            <button className="primario" type="submit" disabled={enviando || !token}>
              {enviando ? 'Salvando…' : ehConvite ? 'Definir senha' : 'Redefinir senha'}
            </button>
            <Link to="/login" className="auth-link">Voltar</Link>
          </div>
        </form>
      )}
    </AuthTela>
  )
}
