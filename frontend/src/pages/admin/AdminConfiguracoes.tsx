import { useEffect, useState } from 'react'
import { listarConfiguracoes, salvarConfiguracao, testarEmail } from '../../api'
import type { Configuracao } from '../../types'

export function AdminConfiguracoes() {
  const [configs, setConfigs] = useState<Configuracao[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  async function carregar() {
    const lista = await listarConfiguracoes()
    setConfigs(lista)
    setValores(Object.fromEntries(lista.map((c) => [c.chave, c.valor ?? ''])))
  }
  useEffect(() => {
    carregar().catch((e) => setErro((e as Error).message))
  }, [])

  function avisar(texto: string) {
    setErro(null); setMsg(texto)
    setTimeout(() => setMsg(null), 6000)
  }

  async function salvarTudo() {
    setSalvando(true)
    setErro(null)
    try {
      const mudadas = configs.filter((c) => (c.valor ?? '') !== (valores[c.chave] ?? ''))
      for (const c of mudadas) {
        await salvarConfiguracao(c.chave, valores[c.chave] ?? '')
      }
      avisar(mudadas.length > 0
        ? `${mudadas.length} configuração(ões) salva(s) — já valendo, sem restart.`
        : 'Nada mudou.')
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function testar() {
    setTestando(true)
    setErro(null)
    try {
      const r = await testarEmail()
      avisar(r.simulado
        ? 'SMTP não configurado — e-mail simulado no console do servidor.'
        : `E-mail de teste enviado para ${r.para}. Verifique a caixa de entrada.`)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setTestando(false)
    }
  }

  const grupos: { titulo: string; filtro: (c: Configuracao) => boolean }[] = [
    { titulo: 'E-mail (SMTP)', filtro: (c) => c.chave.startsWith('smtp_') },
    { titulo: 'Sistema', filtro: (c) => !c.chave.startsWith('smtp_') },
  ]

  return (
    <>
      {msg && <div className="stamp ok" role="status">✓ {msg}</div>}
      {erro && <div className="stamp erro" role="alert">✕ {erro}</div>}

      {grupos.map((g) => (
        <section className="plate admin-config-grupo" key={g.titulo}>
          <h2>{g.titulo}</h2>
          {configs.filter(g.filtro).map((c) => (
            <div className="config-linha" key={c.chave}>
              <label htmlFor={`cfg-${c.chave}`}>
                <span className="config-chave">{c.chave}</span>
                <small>{c.descricao}</small>
              </label>
              <input
                id={`cfg-${c.chave}`}
                type={c.secreta ? 'password' : 'text'}
                value={valores[c.chave] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
                autoComplete="off"
              />
            </div>
          ))}
        </section>
      ))}

      <div className="admin-config-acoes">
        <button className="primario" onClick={() => void salvarTudo()} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button className="acao" onClick={() => void testar()} disabled={testando}>
          {testando ? 'Enviando…' : 'Enviar e-mail de teste para mim'}
        </button>
      </div>

      <p className="admin-nota">
        Valores secretos aparecem mascarados (••••••••) — deixe assim para manter o
        valor atual, ou digite um novo para substituir.
      </p>
    </>
  )
}
