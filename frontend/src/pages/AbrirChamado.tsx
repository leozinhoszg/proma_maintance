import { useState } from 'react'
import { criarChamado } from '../api'
import type { NovoChamado, Prioridade, TipoProblema } from '../types'

const TIPOS: TipoProblema[] = ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro']
const PRIORIDADES: Prioridade[] = ['baixa', 'media', 'alta', 'urgente']

const vazio: NovoChamado = {
  maquina: '', setor: '', tipo_problema: 'mecanico', prioridade: 'media',
  descricao: '', operador: '', maquina_parada: false,
}

export function AbrirChamado() {
  const [form, setForm] = useState<NovoChamado>(vazio)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof NovoChamado>(k: K, v: NovoChamado[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null); setMsg(null)
    try {
      const c = await criarChamado(form)
      setMsg(`Chamado aberto com sucesso (nº ${c.id}).`)
      setForm(vazio)
    } catch (err) {
      setErro((err as Error).message)
    }
  }

  return (
    <>
      <h1>Abrir Chamado de Manutenção</h1>
      {msg && <div className="card" style={{ color: '#059669' }}>{msg}</div>}
      {erro && <div className="card" style={{ color: '#dc2626' }}>{erro}</div>}
      <form onSubmit={enviar}>
        <label>Máquina
          <input value={form.maquina} onChange={(e) => set('maquina', e.target.value)} required />
        </label>
        <label>Setor
          <input value={form.setor} onChange={(e) => set('setor', e.target.value)} required />
        </label>
        <label>Tipo de problema
          <select value={form.tipo_problema} onChange={(e) => set('tipo_problema', e.target.value as TipoProblema)}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Prioridade
          <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value as Prioridade)}>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>Descrição
          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required />
        </label>
        <label>Operador
          <input value={form.operador} onChange={(e) => set('operador', e.target.value)} required />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center' }}>
          <input type="checkbox" checked={form.maquina_parada} onChange={(e) => set('maquina_parada', e.target.checked)} />
          Máquina parada (produção interrompida)
        </label>
        <button type="submit">Abrir chamado</button>
      </form>
    </>
  )
}
