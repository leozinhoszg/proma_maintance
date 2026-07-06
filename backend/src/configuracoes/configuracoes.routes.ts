import { Router } from 'express'
import knex from '../db/knex.js'
import { exigirAuth, exigirPermissao } from '../auth/middleware.js'
import { asyncHandler } from '../http/async.js'
import { listarConfigs, definirConfig } from './configuracoes.service.js'
import { enviarEmail } from '../email/email.service.js'
import { emailTeste } from '../email/templates.js'

const router = Router()
router.use('/configuracoes', exigirAuth, exigirPermissao('pode_administrar'))

// valor-sentinela: o cliente devolve isto quando NÃO quer alterar um segredo
export const SEGREDO_MASCARADO = '••••••••'

router.get('/configuracoes', asyncHandler(async (_req, res) => {
  const configs = await listarConfigs()
  res.json(configs.map((c) => ({
    ...c,
    valor: c.secreta && c.valor ? SEGREDO_MASCARADO : c.valor,
  })))
}))

router.patch('/configuracoes/:chave', asyncHandler(async (req, res) => {
  const chave = req.params.chave
  const { valor } = req.body ?? {}
  if (typeof valor !== 'string') {
    res.status(400).json({ error: 'valor deve ser texto' })
    return
  }
  const existente = await knex('configuracoes').where({ chave }).first()
  if (!existente) {
    res.status(404).json({ error: 'configuração não encontrada' })
    return
  }
  // sentinela = manter o segredo atual
  if (existente.secreta && valor === SEGREDO_MASCARADO) {
    res.json({ ok: true, inalterada: true })
    return
  }
  await definirConfig(chave, valor)
  res.json({ ok: true })
}))

router.post('/configuracoes/testar-email', asyncHandler(async (req, res) => {
  const { para } = req.body ?? {}
  const destino = typeof para === 'string' && para.includes('@') ? para : req.usuario!.email
  try {
    const tpl = emailTeste()
    const { simulado } = await enviarEmail({ para: destino, ...tpl })
    res.json({ ok: true, simulado, para: destino })
  } catch (e) {
    res.status(502).json({ error: `falha no envio: ${(e as Error).message}` })
  }
}))

export default router
