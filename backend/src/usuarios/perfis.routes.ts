import { Router } from 'express'
import knex from '../db/knex.js'
import { exigirAuth, exigirPermissao } from '../auth/middleware.js'
import { asyncHandler } from '../http/async.js'

const router = Router()
router.use('/perfis', exigirAuth, exigirPermissao('pode_administrar'))

function validarPerfil(body: any): { nome: string; pode_abrir: boolean; pode_atender: boolean; pode_administrar: boolean } | null {
  const { nome, pode_abrir, pode_atender, pode_administrar } = body ?? {}
  if (typeof nome !== 'string' || nome.trim().length < 2) return null
  for (const p of [pode_abrir, pode_atender, pode_administrar]) {
    if (typeof p !== 'boolean') return null
  }
  return { nome: nome.trim(), pode_abrir, pode_atender, pode_administrar }
}

router.get('/perfis', asyncHandler(async (_req, res) => {
  const perfis = await knex('perfis')
    .select('perfis.*')
    .count('usuarios.id as total_usuarios')
    .leftJoin('usuarios', 'usuarios.perfil_id', 'perfis.id')
    .groupBy('perfis.id')
    .orderBy('perfis.id')
  res.json(perfis)
}))

router.post('/perfis', asyncHandler(async (req, res) => {
  const dados = validarPerfil(req.body)
  if (!dados) {
    res.status(400).json({ error: 'informe nome e as três permissões (booleanos)' })
    return
  }
  const existente = await knex('perfis').where({ nome: dados.nome }).first()
  if (existente) {
    res.status(409).json({ error: 'já existe perfil com este nome' })
    return
  }
  const [id] = await knex('perfis').insert(dados)
  res.status(201).json({ id, ...dados })
}))

router.patch('/perfis/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const perfil = await knex('perfis').where({ id }).first()
  if (!perfil) {
    res.status(404).json({ error: 'perfil não encontrado' })
    return
  }
  const dados = validarPerfil({ ...perfil, ...req.body })
  if (!dados) {
    res.status(400).json({ error: 'dados inválidos' })
    return
  }
  // trava de segurança: não deixar o sistema sem nenhum perfil administrador
  if (perfil.pode_administrar && !dados.pode_administrar) {
    const outros = await knex('perfis').where({ pode_administrar: true }).whereNot({ id })
    if (outros.length === 0) {
      res.status(400).json({ error: 'este é o único perfil administrador — crie outro antes de remover a permissão' })
      return
    }
  }
  await knex('perfis').where({ id }).update(dados)
  // permissões mudaram: sessões de quem usa este perfil são revogadas
  const usuarios = await knex('usuarios').where({ perfil_id: id }).select('id')
  if (usuarios.length > 0) {
    await knex('sessoes').whereIn('usuario_id', usuarios.map((u) => u.id)).del()
  }
  res.json({ id, ...dados })
}))

router.delete('/perfis/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const perfil = await knex('perfis').where({ id }).first()
  if (!perfil) {
    res.status(404).json({ error: 'perfil não encontrado' })
    return
  }
  const emUso = await knex('usuarios').where({ perfil_id: id }).first()
  if (emUso) {
    res.status(400).json({ error: 'perfil em uso por usuários — mova-os antes de excluir' })
    return
  }
  await knex('perfis').where({ id }).del()
  res.status(204).end()
}))

export default router
