import { Router } from 'express'
import {
  criarChamado,
  listarChamados,
  atualizarStatus,
} from './chamados.service.js'
import {
  TIPOS_PROBLEMA,
  PRIORIDADES,
  STATUSES,
  type NovoChamado,
  type Status,
} from './chamados.types.js'
import { broadcast } from '../sse/sse.broker.js'

const router = Router()

function validarNovo(body: any): string | null {
  const campos = ['maquina', 'setor', 'tipo_problema', 'prioridade', 'descricao', 'operador']
  for (const c of campos) {
    if (typeof body[c] !== 'string' || body[c].trim() === '') return `campo obrigatorio: ${c}`
  }
  if (!TIPOS_PROBLEMA.includes(body.tipo_problema)) return 'tipo_problema invalido'
  if (!PRIORIDADES.includes(body.prioridade)) return 'prioridade invalida'
  if (typeof body.maquina_parada !== 'boolean') return 'maquina_parada deve ser booleano'
  return null
}

router.post('/chamados', async (req, res) => {
  const erro = validarNovo(req.body)
  if (erro) return res.status(400).json({ error: erro })
  const chamado = await criarChamado(req.body as NovoChamado)
  broadcast('chamado:criado', chamado)
  res.status(201).json(chamado)
})

router.get('/chamados', async (req, res) => {
  const status = req.query.status as Status | undefined
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status invalido' })
  }
  const chamados = await listarChamados(status)
  res.json(chamados)
})

router.patch('/chamados/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const novo = req.body.status as Status
  if (!STATUSES.includes(novo)) return res.status(400).json({ error: 'status invalido' })
  try {
    const chamado = await atualizarStatus(id, novo)
    broadcast('chamado:atualizado', chamado)
    res.json(chamado)
  } catch (e) {
    const msg = (e as Error).message
    const code = msg === 'chamado nao encontrado' ? 404 : 400
    res.status(code).json({ error: msg })
  }
})

export default router
