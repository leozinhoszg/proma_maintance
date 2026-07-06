import { Suspense, lazy, useState } from 'react'
import { motion } from 'framer-motion'
import { criarChamado } from '../api'
import type { NovoChamado, Prioridade, TipoProblema } from '../types'

// three.js só é baixado nesta página, sob demanda
const GearCanvas = lazy(() =>
  import('../components/GearCanvas').then((m) => ({ default: m.GearCanvas })),
)

const TIPOS: { valor: TipoProblema; rotulo: string }[] = [
  { valor: 'eletrico', rotulo: 'Elétrico' },
  { valor: 'mecanico', rotulo: 'Mecânico' },
  { valor: 'hidraulico', rotulo: 'Hidráulico' },
  { valor: 'software', rotulo: 'Software' },
  { valor: 'outro', rotulo: 'Outro' },
]
const PRIORIDADES: { valor: Prioridade; rotulo: string }[] = [
  { valor: 'baixa', rotulo: 'Baixa' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'urgente', rotulo: 'Urgente' },
]

const vazio: NovoChamado = {
  maquina: '', setor: '', tipo_problema: 'mecanico', prioridade: 'media',
  descricao: '', maquina_parada: false,
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
      setMsg(`Chamado aberto com sucesso — OS-${String(c.id).padStart(3, '0')}`)
      setForm(vazio)
    } catch (err) {
      setErro((err as Error).message)
    }
  }

  return (
    <>
      <motion.div
        className="page-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <p className="eyebrow">Ordem de serviço · Manutenção</p>
        <h1>Abrir chamado</h1>
        <p className="sub">
          Registre a ocorrência da máquina. A equipe de manutenção recebe o chamado
          no painel no mesmo instante.
        </p>
      </motion.div>

      {msg && <div className="stamp ok" role="status">✓ {msg}</div>}
      {erro && <div className="stamp erro" role="alert">✕ {erro}</div>}

      <div className="os-layout">
        <motion.form
          className="os-form"
          onSubmit={enviar}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="os-form-head">
            <span className="os-tag">Formulário de abertura</span>
            <span className="os-hint">campos 01–06</span>
          </div>

          <div className="os-fields">
            <div className="field">
              <span className="fnum">01</span>
              <label>Máquina
                <input
                  value={form.maquina}
                  onChange={(e) => set('maquina', e.target.value)}
                  placeholder="Ex.: Prensa Hidráulica 3"
                  required
                />
              </label>
            </div>

            <div className="field">
              <span className="fnum">02</span>
              <label>Setor
                <input
                  value={form.setor}
                  onChange={(e) => set('setor', e.target.value)}
                  placeholder="Ex.: Estamparia"
                  required
                />
              </label>
            </div>

            <div className="field">
              <span className="fnum">03</span>
              <label>Tipo de problema
                <select
                  value={form.tipo_problema}
                  onChange={(e) => set('tipo_problema', e.target.value as TipoProblema)}
                >
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                </select>
              </label>
            </div>

            <div className="field">
              <span className="fnum">04</span>
              <label>Prioridade
                <select
                  value={form.prioridade}
                  onChange={(e) => set('prioridade', e.target.value as Prioridade)}
                >
                  {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                </select>
              </label>
            </div>

            <div className="field">
              <span className="fnum">05</span>
              <label>Descrição
                <textarea
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  placeholder="Descreva o que está acontecendo com a máquina"
                  required
                />
              </label>
            </div>

            <div className="field field-parada">
              <span className="fnum">06</span>
              <label>
                <input
                  type="checkbox"
                  checked={form.maquina_parada}
                  onChange={(e) => set('maquina_parada', e.target.checked)}
                />
                Máquina parada (produção interrompida)
              </label>
            </div>
          </div>

          <div className="os-actions">
            <button className="primario" type="submit">Abrir chamado</button>
          </div>
        </motion.form>

        <motion.aside
          className="os-aside"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.16 }}
        >
          <Suspense fallback={<div className="gear-frame" aria-hidden="true" />}>
            <GearCanvas />
          </Suspense>
          <div className="plate">
            <h2>Como funciona</h2>
            <p>
              O chamado entra na fila da manutenção em tempo real. Máquina parada e
              prioridade urgente sobem para o topo do painel automaticamente.
            </p>
          </div>
          <div className="plate">
            <div className="plate-row"><span>Fluxo</span><b>aberto → atendimento → concluído</b></div>
            <div className="plate-row"><span>Canal</span><b>SSE · tempo real</b></div>
            <div className="plate-row"><span>Fila</span><b>parada &amp; urgência primeiro</b></div>
          </div>
        </motion.aside>
      </div>
    </>
  )
}
