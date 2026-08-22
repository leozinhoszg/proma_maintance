import { Router } from 'express'
import knex from '../db/knex.js'
import { exigirAuth, exigirPermissao } from '../auth/middleware.js'
import { asyncHandler } from '../http/async.js'
import { criarTokenSenha } from '../auth/auth.service.js'
import { enviarEmail } from '../email/email.service.js'
import { emailConvite } from '../email/templates.js'
import { obterConfig, obterConfigNumero } from '../configuracoes/configuracoes.service.js'
import { closeUser } from '../sse/sse.broker.js'

const router = Router()
router.use('/usuarios', exigirAuth, exigirPermissao('pode_administrar'))

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CAMPOS_PUBLICOS = [
  'usuarios.id', 'usuarios.nome', 'usuarios.email', 'usuarios.ativo',
  'usuarios.criado_em', 'usuarios.perfil_id', 'perfis.nome as perfil_nome',
  knex.raw('usuarios.senha_hash is not null as senha_definida'),
]

async function enviarConvite(usuario: { id: number; nome: string; email: string }): Promise<boolean> {
  const { token } = await criarTokenSenha(usuario.id, 'convite')
  const appUrl = await obterConfig('app_url', 'http://localhost:5173')
  const validadeHoras = await obterConfigNumero('convite_validade_horas', 168)
  const link = `${appUrl}/redefinir-senha?token=${token}&convite=1`
  const tpl = emailConvite({ nome: usuario.nome, link, validadeHoras })
  const { simulado } = await enviarEmail({ para: usuario.email, ...tpl })
  return simulado
}

router.get('/usuarios', asyncHandler(async (_req, res) => {
  const usuarios = await knex('usuarios')
    .join('perfis', 'usuarios.perfil_id', 'perfis.id')
    .select(CAMPOS_PUBLICOS)
    .orderBy('usuarios.nome')
  res.json(usuarios)
}))

router.post('/usuarios', asyncHandler(async (req, res) => {
  const { nome, email, perfil_id } = req.body ?? {}
  if (typeof nome !== 'string' || nome.trim().length < 2) {
    res.status(400).json({ error: 'informe o nome' })
    return
  }
  if (typeof email !== 'string' || !EMAIL_VALIDO.test(email)) {
    res.status(400).json({ error: 'e-mail inválido' })
    return
  }
  const perfil = await knex('perfis').where({ id: Number(perfil_id) }).first()
  if (!perfil) {
    res.status(400).json({ error: 'perfil inválido' })
    return
  }
  const emailNormalizado = email.trim().toLowerCase()
  const existente = await knex('usuarios').where({ email: emailNormalizado }).first()
  if (existente) {
    res.status(409).json({ error: 'já existe usuário com este e-mail' })
    return
  }

  const [id] = await knex('usuarios').insert({
    nome: nome.trim(), email: emailNormalizado, perfil_id: perfil.id, senha_hash: null,
  })
  const simulado = await enviarConvite({ id, nome: nome.trim(), email: emailNormalizado })
    .catch((e) => {
      console.error('[usuarios] falha ao enviar convite:', (e as Error).message)
      return true
    })

  res.status(201).json({
    id, nome: nome.trim(), email: emailNormalizado, perfil_id: perfil.id,
    convite_simulado: simulado,
  })
}))

router.patch('/usuarios/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const usuario = await knex('usuarios').where({ id }).first()
  if (!usuario) {
    res.status(404).json({ error: 'usuário não encontrado' })
    return
  }

  const mudancas: Record<string, unknown> = {}
  const { nome, perfil_id, ativo } = req.body ?? {}
  if (nome !== undefined) {
    if (typeof nome !== 'string' || nome.trim().length < 2) {
      res.status(400).json({ error: 'nome inválido' })
      return
    }
    mudancas.nome = nome.trim()
  }
  if (perfil_id !== undefined) {
    const perfil = await knex('perfis').where({ id: Number(perfil_id) }).first()
    if (!perfil) {
      res.status(400).json({ error: 'perfil inválido' })
      return
    }
    mudancas.perfil_id = perfil.id
  }
  if (ativo !== undefined) {
    if (typeof ativo !== 'boolean') {
      res.status(400).json({ error: 'ativo deve ser booleano' })
      return
    }
    // ninguém desativa a própria conta — evita trancar-se para fora
    if (!ativo && id === req.usuario!.id) {
      res.status(400).json({ error: 'você não pode desativar a própria conta' })
      return
    }
    mudancas.ativo = ativo
  }

  if (Object.keys(mudancas).length === 0) {
    res.status(400).json({ error: 'nada para atualizar' })
    return
  }

  await knex('usuarios').where({ id }).update(mudancas)
  // desativar ou trocar perfil revoga as sessões abertas do usuário
  if (mudancas.ativo === false || mudancas.perfil_id !== undefined) {
    await knex('sessoes').where({ usuario_id: id }).del()
    closeUser(id)
  }
  const atualizado = await knex('usuarios')
    .join('perfis', 'usuarios.perfil_id', 'perfis.id')
    .where({ 'usuarios.id': id })
    .select(CAMPOS_PUBLICOS)
    .first()
  res.json(atualizado)
}))

router.post('/usuarios/:id/reenviar-convite', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const usuario = await knex('usuarios').where({ id }).first()
  if (!usuario) {
    res.status(404).json({ error: 'usuário não encontrado' })
    return
  }
  if (usuario.senha_hash) {
    res.status(400).json({ error: 'usuário já definiu a senha — use "esqueci minha senha"' })
    return
  }
  const simulado = await enviarConvite(usuario).catch(() => true)
  res.json({ ok: true, convite_simulado: simulado })
}))

export default router
