import { useEffect, useState } from 'react'
import {
  listarUsuarios, criarUsuario, atualizarUsuario, reenviarConvite, listarPerfis,
} from '../../api'
import { useAuth } from '../../auth/AuthContext'
import type { Perfil, UsuarioLista } from '../../types'

export function AdminUsuarios() {
  const { usuario: eu } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<number | ''>('')
  const [criando, setCriando] = useState(false)

  async function carregar() {
    const [us, ps] = await Promise.all([listarUsuarios(), listarPerfis()])
    setUsuarios(us)
    setPerfis(ps)
    if (novoPerfil === '' && ps.length > 0) setNovoPerfil(ps[0].id)
  }

  useEffect(() => {
    carregar().catch((e) => setErro((e as Error).message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function avisar(texto: string) {
    setErro(null)
    setMsg(texto)
    setTimeout(() => setMsg(null), 6000)
  }
  function falhar(e: unknown) {
    setMsg(null)
    setErro((e as Error).message)
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (novoPerfil === '') return
    setCriando(true)
    setErro(null)
    try {
      const r = await criarUsuario({ nome: novoNome, email: novoEmail, perfil_id: novoPerfil })
      avisar(
        r.convite_simulado
          ? 'Usuário criado. SMTP não configurado — o link do convite foi registrado no console do servidor.'
          : 'Usuário criado — convite enviado por e-mail.',
      )
      setNovoNome(''); setNovoEmail('')
      await carregar()
    } catch (err) {
      falhar(err)
    } finally {
      setCriando(false)
    }
  }

  async function mudarPerfil(u: UsuarioLista, perfilId: number) {
    try {
      await atualizarUsuario(u.id, { perfil_id: perfilId })
      avisar(`Perfil de ${u.nome} atualizado — sessões antigas foram encerradas.`)
      await carregar()
    } catch (err) { falhar(err) }
  }

  async function mudarAtivo(u: UsuarioLista) {
    try {
      await atualizarUsuario(u.id, { ativo: !u.ativo })
      avisar(u.ativo ? `${u.nome} desativado — acesso revogado.` : `${u.nome} reativado.`)
      await carregar()
    } catch (err) { falhar(err) }
  }

  async function reenviar(u: UsuarioLista) {
    try {
      const r = await reenviarConvite(u.id)
      avisar(r.convite_simulado
        ? 'Convite gerado. SMTP não configurado — link no console do servidor.'
        : `Convite reenviado para ${u.email}.`)
    } catch (err) { falhar(err) }
  }

  return (
    <>
      {msg && <div className="stamp ok" role="status">✓ {msg}</div>}
      {erro && <div className="stamp erro" role="alert">✕ {erro}</div>}

      <form className="admin-nova-linha" onSubmit={criar}>
        <input
          placeholder="Nome completo"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="email@promagroup.com"
          value={novoEmail}
          onChange={(e) => setNovoEmail(e.target.value)}
          required
        />
        <select value={novoPerfil} onChange={(e) => setNovoPerfil(Number(e.target.value))}>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button className="primario" type="submit" disabled={criando}>
          {criando ? 'Criando…' : 'Criar + convidar'}
        </button>
      </form>

      <div className="admin-tabela">
        <div className="admin-tr admin-th">
          <span>Usuário</span><span>Perfil</span><span>Situação</span><span>Ações</span>
        </div>
        {usuarios.map((u) => (
          <div className={`admin-tr ${u.ativo ? '' : 'inativo'}`} key={u.id}>
            <span className="admin-usuario">
              <b>{u.nome}</b>
              <small>{u.email}</small>
            </span>
            <span>
              <select
                value={u.perfil_id}
                onChange={(e) => void mudarPerfil(u, Number(e.target.value))}
                disabled={u.id === eu?.id}
                title={u.id === eu?.id ? 'Você não pode alterar o próprio perfil aqui' : ''}
              >
                {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </span>
            <span>
              {!u.ativo && <span className="tag urgente">desativado</span>}
              {Boolean(u.ativo) && (Boolean(u.senha_definida)
                ? <span className="tag" style={{ color: 'var(--green)' }}>ativo</span>
                : <span className="tag parada">convite pendente</span>)}
            </span>
            <span className="admin-acoes">
              {!u.senha_definida && (
                <button className="acao" onClick={() => void reenviar(u)}>Reenviar convite</button>
              )}
              <button
                className={`acao ${u.ativo ? '' : 'concluir'}`}
                onClick={() => void mudarAtivo(u)}
                disabled={u.id === eu?.id}
                title={u.id === eu?.id ? 'Você não pode desativar a própria conta' : ''}
              >
                {u.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
