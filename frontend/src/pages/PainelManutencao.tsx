import { useEffect, useMemo, useState } from 'react'
import { listarChamados, atualizarStatus } from '../api'
import { useSSE } from '../useSSE'
import type { Chamado, Status } from '../types'

const PESO_PRIORIDADE: Record<Chamado['prioridade'], number> = {
  urgente: 0, alta: 1, media: 2, baixa: 3,
}

export function PainelManutencao() {
  const [chamados, setChamados] = useState<Chamado[]>([])

  useEffect(() => {
    listarChamados().then(setChamados).catch(() => setChamados([]))
  }, [])

  useSSE({
    onCriado: (c) => setChamados((cs) => [c, ...cs.filter((x) => x.id !== c.id)]),
    onAtualizado: (c) => setChamados((cs) => cs.map((x) => (x.id === c.id ? c : x))),
  })

  const ordenados = useMemo(
    () =>
      [...chamados].sort((a, b) => {
        if (a.maquina_parada !== b.maquina_parada) return a.maquina_parada ? -1 : 1
        return PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]
      }),
    [chamados],
  )

  const abertos = chamados.filter((c) => c.status === 'aberto').length
  const emAtendimento = chamados.filter((c) => c.status === 'em_atendimento').length
  const urgentes = chamados.filter((c) => c.prioridade === 'urgente' && c.status !== 'concluido').length

  async function mudar(id: number, status: Status) {
    try {
      await atualizarStatus(id, status)
    } catch { /* o estado será corrigido pelo SSE se necessário */ }
  }

  return (
    <>
      <h1>Painel da Manutenção</h1>
      <div className="contadores">
        <div className="contador"><b>{abertos}</b>Abertos</div>
        <div className="contador"><b>{emAtendimento}</b>Em atendimento</div>
        <div className="contador" style={{ color: '#dc2626' }}><b>{urgentes}</b>Urgentes</div>
      </div>

      {ordenados.length === 0 && <p>Nenhum chamado.</p>}

      {ordenados.map((c) => (
        <div key={c.id} className={`card ${c.prioridade === 'urgente' ? 'urgente' : ''} ${c.maquina_parada ? 'parada' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>#{c.id} — {c.maquina} <span style={{ fontWeight: 400 }}>({c.setor})</span></strong>
            <span className="badge">{c.status}</span>
          </div>
          <p style={{ margin: '8px 0' }}>{c.descricao}</p>
          <small>
            {c.tipo_problema} · prioridade {c.prioridade} · operador {c.operador}
            {c.maquina_parada && ' · MÁQUINA PARADA'}
          </small>
          <div style={{ marginTop: 12 }}>
            {c.status === 'aberto' && (
              <button onClick={() => mudar(c.id, 'em_atendimento')}>Assumir</button>
            )}
            {c.status === 'em_atendimento' && (
              <button className="secundario" onClick={() => mudar(c.id, 'concluido')}>Concluir</button>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
