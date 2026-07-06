import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { listarChamados, atualizarStatus } from '../api'
import { useSSE } from '../useSSE'
import type { Chamado, Status } from '../types'

const PESO_PRIORIDADE: Record<Chamado['prioridade'], number> = {
  urgente: 0, alta: 1, media: 2, baixa: 3,
}

const STATUS_INFO: Record<Status, { rotulo: string; cor: string }> = {
  aberto: { rotulo: 'Aberto', cor: 'var(--red)' },
  em_atendimento: { rotulo: 'Em atendimento', cor: 'var(--amber)' },
  concluido: { rotulo: 'Concluído', cor: 'var(--green)' },
}

const ROTULO_TIPO: Record<Chamado['tipo_problema'], string> = {
  eletrico: 'Elétrico', mecanico: 'Mecânico', hidraulico: 'Hidráulico',
  software: 'Software', outro: 'Outro',
}

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function PainelManutencao() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  // ids chegados via SSE nesta sessão — recebem o flash âmbar de entrada
  const [novos, setNovos] = useState<Set<number>>(new Set())

  useEffect(() => {
    listarChamados().then(setChamados).catch(() => setChamados([]))
  }, [])

  const aoVivo = useSSE({
    onCriado: (c) => {
      setNovos((s) => new Set(s).add(c.id))
      setChamados((cs) => [c, ...cs.filter((x) => x.id !== c.id)])
    },
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
      <motion.div
        className="page-head painel-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div>
          <p className="eyebrow">Andon · Fila de manutenção</p>
          <h1>Painel da manutenção</h1>
        </div>
        <span className={`live-pill ${aoVivo ? 'on' : ''}`}>
          <span className="led" aria-hidden="true" />
          {aoVivo ? 'Ao vivo' : 'Conectando…'}
        </span>
      </motion.div>

      <motion.div
        className="andon"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
      >
        <div
          className={`andon-cell ${abertos > 0 ? 'aceso' : ''}`}
          style={{ '--cor': 'var(--red)' } as React.CSSProperties}
        >
          <div className="valor">{abertos}</div>
          <div className="rotulo">Abertos</div>
        </div>
        <div
          className={`andon-cell ${emAtendimento > 0 ? 'aceso' : ''}`}
          style={{ '--cor': 'var(--amber)' } as React.CSSProperties}
        >
          <div className="valor">{emAtendimento}</div>
          <div className="rotulo">Em atendimento</div>
        </div>
        <div
          className={`andon-cell ${urgentes > 0 ? 'aceso alarme' : ''}`}
          style={{ '--cor': 'var(--red)' } as React.CSSProperties}
        >
          <div className="valor">{urgentes}</div>
          <div className="rotulo">Urgentes</div>
        </div>
      </motion.div>

      {ordenados.length === 0 && <p className="vazio">Nenhum chamado na fila</p>}

      <div className="chamados-grid">
        {ordenados.map((c, i) => {
          const st = STATUS_INFO[c.status]
          const chegouAgora = novos.has(c.id)
          return (
            <motion.article
              key={c.id}
              layout
              className={[
                'chamado',
                c.prioridade === 'urgente' && c.status !== 'concluido' ? 'eh-urgente' : '',
                c.maquina_parada && c.status !== 'concluido' ? 'eh-parada' : '',
              ].join(' ')}
              style={{ '--cor-status': st.cor } as React.CSSProperties}
              initial={
                chegouAgora
                  ? { opacity: 0, y: -18, boxShadow: '0 0 32px rgba(255,179,0,0.55)' }
                  : { opacity: 0, y: 14 }
              }
              animate={{ opacity: 1, y: 0, boxShadow: '0 0 0 rgba(255,179,0,0)' }}
              transition={
                chegouAgora
                  ? { duration: 0.6, ease: 'easeOut' }
                  : { duration: 0.4, ease: 'easeOut', delay: Math.min(i * 0.05, 0.4) }
              }
            >
              <div className="chamado-top">
                <span className="chamado-os">OS-{String(c.id).padStart(3, '0')}</span>
                <span className="chamado-maquina">{c.maquina}</span>
                <span className="badge-status">{st.rotulo}</span>
              </div>

              <div className="chamado-meta">
                <span className="tag">{c.setor}</span>
                <span className="tag">{ROTULO_TIPO[c.tipo_problema]}</span>
                <span className={`tag ${c.prioridade === 'urgente' ? 'urgente' : ''}`}>
                  prioridade {c.prioridade}
                </span>
                {c.maquina_parada && <span className="tag parada">máquina parada</span>}
              </div>

              <p className="chamado-desc">{c.descricao}</p>

              <div className="chamado-foot">
                <span className="chamado-quem">
                  <b>{c.operador}</b> · {horaCurta(c.criado_em)}
                </span>
                {c.status === 'aberto' && (
                  <button className="acao" onClick={() => mudar(c.id, 'em_atendimento')}>
                    Assumir
                  </button>
                )}
                {c.status === 'em_atendimento' && (
                  <button className="acao concluir" onClick={() => mudar(c.id, 'concluido')}>
                    Concluir
                  </button>
                )}
              </div>
            </motion.article>
          )
        })}
      </div>
    </>
  )
}
