import { Router } from 'express'
import {
  criarChamado,
  listarChamados,
  atualizarStatus,
  ChamadoNaoEncontradoError,
  TransicaoChamadoConflitanteError,
} from './chamados.service.js'
import {
  TIPOS_PROBLEMA,
  PRIORIDADES,
  STATUSES,
  type NovoChamado,
  type Status,
} from './chamados.types.js'
import { broadcast } from '../sse/sse.broker.js'
import { exigirAuth, exigirPermissao } from '../auth/middleware.js'
import { asyncHandler } from '../http/async.js'

const router = Router()

function validarNovo(body: any): string | null {
  const campos = ['maquina', 'setor', 'tipo_problema', 'prioridade', 'descricao']
  for (const c of campos) {
    if (typeof body[c] !== 'string' || body[c].trim() === '') return `campo obrigatorio: ${c}`
  }
  if (!TIPOS_PROBLEMA.includes(body.tipo_problema)) return 'tipo_problema invalido'
  if (!PRIORIDADES.includes(body.prioridade)) return 'prioridade invalida'
  if (typeof body.maquina_parada !== 'boolean') return 'maquina_parada deve ser booleano'
  return null
}

router.post('/chamados', exigirAuth, exigirPermissao('pode_abrir'), asyncHandler(async (req, res) => {
  const erro = validarNovo(req.body)
  if (erro) {
    res.status(400).json({ error: erro })
    return
  }
  // solicitante vem da sessão — o payload não decide quem abriu
  const { maquina, setor, tipo_problema, prioridade, descricao, maquina_parada } = req.body as NovoChamado
  const chamado = await criarChamado(
    { maquina, setor, tipo_problema, prioridade, descricao, maquina_parada },
    req.usuario!.id,
  )
  broadcast('chamado:criado', chamado)
  res.status(201).json(chamado)
}))

router.get('/chamados', exigirAuth, asyncHandler(async (req, res) => {
  const status = req.query.status as Status | undefined
  if (status && !STATUSES.includes(status)) {
    res.status(400).json({ error: 'status invalido' })
    return
  }
  res.json(await listarChamados(status))
}))

router.patch('/chamados/:id/status', exigirAuth, exigirPermissao('pode_atender'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const novo = req.body?.status as Status
  if (!Number.isInteger(id) || !STATUSES.includes(novo)) {
    res.status(400).json({ error: 'dados invalidos' })
    return
  }
  try {
    const chamado = await atualizarStatus(id, novo, req.usuario!.id)
    broadcast('chamado:atualizado', chamado)
    res.json(chamado)
  } catch (e) {
    if (e instanceof ChamadoNaoEncontradoError) {
      res.status(404).json({ error: e.message })
      return
    }
    if (e instanceof TransicaoChamadoConflitanteError) {
      res.status(409).json({ error: e.message })
      return
    }
    throw e
  }
}))

export default router
