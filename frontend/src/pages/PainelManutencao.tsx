import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listarChamados, atualizarStatus } from '../api'
import { useSSE } from '../useSSE'
import { ordenarFila, tempoRelativo } from '../fila'
import type { Chamado, Status } from '../types'

type Aba = 'fila' | 'atendimento' | 'concluidos'

const STATUS_INFO: Record<Status, { rotulo: string; cor: string }> = {
  aberto: { rotulo: 'Aberto', cor: 'var(--red)' },
  em_atendimento: { rotulo: 'Em atendimento', cor: 'var(--amber)' },
  concluido: { rotulo: 'Concluído', cor: 'var(--green)' },
}

const ROTULO_TIPO: Record<Chamado['tipo_problema'], string> = {
  eletrico: 'Elétrico', mecanico: 'Mecânico', hidraulico: 'Hidráulico',
  software: 'Software', outro: 'Outro',
}

const VAZIO_POR_ABA: Record<Aba, string> = {
  fila: 'Nenhum chamado aguardando — fila limpa',
  atendimento: 'Nenhum chamado em atendimento',
  concluidos: 'Nenhum chamado concluído ainda',
}

function dataCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function PainelManutencao() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [aba, setAba] = useState<Aba>('fila')
  // ids chegados via SSE nesta sessão — recebem o flash âmbar de entrada
  const [novos, setNovos] = useState<Set<number>>(new Set())
  // religa a cada 30s para o tempo de espera não ficar velho
  const [, setTick] = useState(0)

  useEffect(() => {
    listarChamados().then(setChamados).catch(() => setChamados([]))
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const aoVivo = useSSE({
    onCriado: (c) => {
      setNovos((s) => new Set(s).add(c.id))
      setChamados((cs) => [c, ...cs.filter((x) => x.id !== c.id)])
    },
    onAtualizado: (c) => setChamados((cs) => cs.map((x) => (x.id === c.id ? c : x))),
  })

  const fila = useMemo(
    () => ordenarFila(chamados.filter((c) => c.status === 'aberto')),
    [chamados],
  )
  const atendimento = useMemo(
    () => ordenarFila(chamados.filter((c) => c.status === 'em_atendimento')),
    [chamados],
  )
  const concluidos = useMemo(
    () =>
      [...chamados.filter((c) => c.status === 'concluido')].sort(
        (a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime(),
      ),
    [chamados],
  )

  const visiveis = aba === 'fila' ? fila : aba === 'atendimento' ? atendimento : concluidos
  const urgentes = chamados.filter(
    (c) => c.prioridade === 'urgente' && c.status !== 'concluido',
  ).length

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
          <p className="sub">
            Ordem de atendimento: máquina parada primeiro, depois prioridade, depois
            ordem de chegada. <Link className="link-regra" to="/ajuda">Entenda a regra</Link>
          </p>
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
          className={`andon-cell ${fila.length > 0 ? 'aceso' : ''}`}
          style={{ '--cor': 'var(--red)' } as React.CSSProperties}
        >
          <div className="valor">{fila.length}</div>
          <div className="rotulo">Na fila</div>
        </div>
        <div
          className={`andon-cell ${atendimento.length > 0 ? 'aceso' : ''}`}
          style={{ '--cor': 'var(--amber)' } as React.CSSProperties}
        >
          <div className="valor">{atendimento.length}</div>
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

      <div className="tabs" role="tablist" aria-label="Filtrar chamados por status">
        <button
          role="tab"
          aria-selected={aba === 'fila'}
          className={aba === 'fila' ? 'ativo' : ''}
          onClick={() => setAba('fila')}
        >
          Na fila <span className="conta">{fila.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={aba === 'atendimento'}
          className={aba === 'atendimento' ? 'ativo' : ''}
          onClick={() => setAba('atendimento')}
        >
          Em atendimento <span className="conta">{atendimento.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={aba === 'concluidos'}
          className={aba === 'concluidos' ? 'ativo' : ''}
          onClick={() => setAba('concluidos')}
        >
          Concluídos <span className="conta">{concluidos.length}</span>
        </button>
      </div>

      {visiveis.length === 0 && <p className="vazio">{VAZIO_POR_ABA[aba]}</p>}

      <div className="chamados-lista">
        {visiveis.map((c, i) => {
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
                  : { opacity: 0, y: 10 }
              }
              animate={{ opacity: 1, y: 0, boxShadow: '0 0 0 rgba(255,179,0,0)' }}
              transition={
                chegouAgora
                  ? { duration: 0.6, ease: 'easeOut' }
                  : { duration: 0.35, ease: 'easeOut', delay: Math.min(i * 0.04, 0.3) }
              }
            >
              {aba === 'fila' && (
                <span className="pos" title="Posição na fila de atendimento">{i + 1}º</span>
              )}

              <div className="chamado-corpo">
                <div className="chamado-top">
                  <span className="chamado-os">OS-{String(c.id).padStart(3, '0')}</span>
                  <span className="chamado-maquina">{c.maquina}</span>
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
                <span className="chamado-quem">
                  <b>{c.operador}</b> · aberto {dataCurta(c.criado_em)}
                </span>
              </div>

              <div className="chamado-lado">
                <span className="badge-status">{st.rotulo}</span>
                <span className="espera">
                  {c.status === 'aberto' && `aguardando ${tempoRelativo(c.criado_em)}`}
                  {c.status === 'em_atendimento' && `aberto ${tempoRelativo(c.criado_em)}`}
                  {c.status === 'concluido' && `concluído ${dataCurta(c.atualizado_em)}`}
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
