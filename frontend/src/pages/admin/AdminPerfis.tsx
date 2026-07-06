import { useEffect, useState } from 'react'
import { listarPerfis, criarPerfil, atualizarPerfil, excluirPerfil } from '../../api'
import type { Perfil } from '../../types'

const PERMISSOES: { chave: 'pode_abrir' | 'pode_atender' | 'pode_administrar'; rotulo: string }[] = [
  { chave: 'pode_abrir', rotulo: 'Abrir chamados' },
  { chave: 'pode_atender', rotulo: 'Atender chamados' },
  { chave: 'pode_administrar', rotulo: 'Administrar sistema' },
]

export function AdminPerfis() {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')

  async function carregar() {
    setPerfis(await listarPerfis())
  }
  useEffect(() => {
    carregar().catch((e) => setErro((e as Error).message))
  }, [])

  function avisar(texto: string) {
    setErro(null); setMsg(texto)
    setTimeout(() => setMsg(null), 6000)
  }
  function falhar(e: unknown) {
    setMsg(null); setErro((e as Error).message)
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    try {
      await criarPerfil({ nome: novoNome, pode_abrir: true, pode_atender: false, pode_administrar: false })
      setNovoNome('')
      avisar('Perfil criado — ajuste as permissões abaixo.')
      await carregar()
    } catch (err) { falhar(err) }
  }

  async function alternar(p: Perfil, chave: (typeof PERMISSOES)[number]['chave']) {
    try {
      await atualizarPerfil(p.id, { [chave]: !p[chave] })
      avisar(`Permissões de "${p.nome}" atualizadas — sessões dos usuários deste perfil foram renovadas.`)
      await carregar()
    } catch (err) { falhar(err) }
  }

  async function excluir(p: Perfil) {
    if (!window.confirm(`Excluir o perfil "${p.nome}"?`)) return
    try {
      await excluirPerfil(p.id)
      avisar(`Perfil "${p.nome}" excluído.`)
      await carregar()
    } catch (err) { falhar(err) }
  }

  return (
    <>
      {msg && <div className="stamp ok" role="status">✓ {msg}</div>}
      {erro && <div className="stamp erro" role="alert">✕ {erro}</div>}

      <form className="admin-nova-linha" onSubmit={criar}>
        <input
          placeholder="Nome do novo perfil (ex.: Supervisor)"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          required
        />
        <button className="primario" type="submit">Criar perfil</button>
      </form>

      <div className="admin-tabela">
        <div className="admin-tr admin-th perfis">
          <span>Perfil</span>
          {PERMISSOES.map((p) => <span key={p.chave}>{p.rotulo}</span>)}
          <span>Ações</span>
        </div>
        {perfis.map((p) => (
          <div className="admin-tr perfis" key={p.id}>
            <span className="admin-usuario">
              <b>{p.nome}</b>
              <small>{Number(p.total_usuarios ?? 0)} usuário(s)</small>
            </span>
            {PERMISSOES.map(({ chave }) => (
              <span key={chave}>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={Boolean(p[chave])}
                    onChange={() => void alternar(p, chave)}
                  />
                  <i />
                </label>
              </span>
            ))}
            <span className="admin-acoes">
              <button
                className="acao"
                onClick={() => void excluir(p)}
                disabled={Number(p.total_usuarios ?? 0) > 0}
                title={Number(p.total_usuarios ?? 0) > 0 ? 'Mova os usuários antes de excluir' : ''}
              >
                Excluir
              </button>
            </span>
          </div>
        ))}
      </div>

      <p className="admin-nota">
        As permissões valem imediatamente: quem estiver logado com o perfil alterado
        precisará entrar de novo. O sistema impede remover a permissão de administrar
        do único perfil administrador.
      </p>
    </>
  )
}
