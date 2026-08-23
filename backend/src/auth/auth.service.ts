import knex from '../db/knex.js'
import { hashSenha, verificarSenha } from './senha.js'
import { gerarToken, hashToken } from './tokens.js'
import { obterConfigNumero } from '../configuracoes/configuracoes.service.js'

export interface PerfilPermissoes {
  id: number
  nome: string
  pode_abrir: boolean
  pode_atender: boolean
  pode_administrar: boolean
}

export interface UsuarioAutenticado {
  id: number
  nome: string
  email: string
  perfil: PerfilPermissoes
}

export interface SessaoAutenticada {
  id: number
  expiraEm: Date
  usuario: UsuarioAutenticado
}

interface ContextoLogin { ip?: string; userAgent?: string }

type ResultadoLogin =
  | { ok: true; token: string; expiraEm: Date; usuario: UsuarioAutenticado }
  | { ok: false; erro: string }

// mensagem única para email inexistente, senha errada e conta inativa —
// não revela qual dos três aconteceu (anti-enumeração)
const CREDENCIAIS_INVALIDAS = 'credenciais inválidas'

const CAMPOS_USUARIO = [
  'usuarios.id', 'usuarios.nome', 'usuarios.email', 'usuarios.ativo', 'usuarios.senha_hash',
  'perfis.id as perfil_id', 'perfis.nome as perfil_nome',
  'perfis.pode_abrir', 'perfis.pode_atender', 'perfis.pode_administrar',
]

function montarUsuario(linha: any): UsuarioAutenticado {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    perfil: {
      id: linha.perfil_id,
      nome: linha.perfil_nome,
      pode_abrir: Boolean(linha.pode_abrir),
      pode_atender: Boolean(linha.pode_atender),
      pode_administrar: Boolean(linha.pode_administrar),
    },
  }
}

export async function login(email: string, senha: string, ctx: ContextoLogin): Promise<ResultadoLogin> {
  const linha = await knex('usuarios')
    .join('perfis', 'usuarios.perfil_id', 'perfis.id')
    .where({ 'usuarios.email': email })
    .select(CAMPOS_USUARIO)
    .first()

  // verifica a senha SEMPRE (mesmo sem usuário) para custo de tempo constante
  const senhaOk = await verificarSenha(senha, linha?.senha_hash ?? null)
  if (!linha || !senhaOk || !linha.ativo) {
    return { ok: false, erro: CREDENCIAIS_INVALIDAS }
  }

  const horas = await obterConfigNumero('sessao_duracao_horas', 12)
  const { token, hash } = gerarToken()
  const expiraEm = new Date(Date.now() + horas * 3600_000)
  await knex('sessoes').insert({
    usuario_id: linha.id,
    token_hash: hash,
    expira_em: expiraEm,
    ip: ctx.ip ?? null,
    user_agent: ctx.userAgent?.slice(0, 255) ?? null,
  })

  return { ok: true, token, expiraEm, usuario: montarUsuario(linha) }
}

export async function validarSessao(token: string): Promise<SessaoAutenticada | null> {
  const linha = await knex('sessoes')
    .join('usuarios', 'sessoes.usuario_id', 'usuarios.id')
    .join('perfis', 'usuarios.perfil_id', 'perfis.id')
    .where({ 'sessoes.token_hash': hashToken(token) })
    .select([...CAMPOS_USUARIO, 'sessoes.id as sessao_id', 'sessoes.expira_em'])
    .first()

  if (!linha) return null
  if (new Date(linha.expira_em).getTime() < Date.now()) {
    await knex('sessoes').where({ id: linha.sessao_id }).del()
    return null
  }
  if (!linha.ativo) return null
  return {
    id: linha.sessao_id,
    expiraEm: new Date(linha.expira_em),
    usuario: montarUsuario(linha),
  }
}

export async function validarSessaoPorId(id: number): Promise<boolean> {
  const linha = await knex('sessoes')
    .join('usuarios', 'sessoes.usuario_id', 'usuarios.id')
    .where({ 'sessoes.id': id })
    .select('sessoes.expira_em', 'usuarios.ativo')
    .first()

  if (!linha) return false
  if (!linha.ativo || new Date(linha.expira_em).getTime() < Date.now()) {
    await knex('sessoes').where({ id }).del()
    return false
  }
  return true
}

export async function logout(token: string): Promise<number | null> {
  const sessao = await knex('sessoes').where({ token_hash: hashToken(token) }).first('id')
  if (!sessao) return null
  await knex('sessoes').where({ id: sessao.id }).del()
  return sessao.id
}

/** Cria token de definição de senha (convite de novo usuário ou reset). */
export async function criarTokenSenha(usuarioId: number, tipo: 'convite' | 'reset'): Promise<{ token: string; validaAte: Date }> {
  const validadeMs = tipo === 'reset'
    ? (await obterConfigNumero('reset_validade_min', 30)) * 60_000
    : (await obterConfigNumero('convite_validade_horas', 168)) * 3600_000
  const { token, hash } = gerarToken()
  const validaAte = new Date(Date.now() + validadeMs)
  await knex.transaction(async (trx) => {
    const usuario = await trx('usuarios').where({ id: usuarioId }).forUpdate().first('id')
    if (!usuario) throw new Error('usuario nao encontrado ao criar token')

    await trx('tokens_senha')
      .where({ usuario_id: usuarioId, tipo })
      .whereNull('usado_em')
      .update({ usado_em: new Date() })
    await trx('tokens_senha').insert({
      usuario_id: usuarioId, token_hash: hash, tipo, expira_em: validaAte,
    })
  })
  return { token, validaAte }
}

/** Sempre retorna algo utilizável pela rota; null = email não existe (rota responde 200 igual). */
export async function solicitarReset(email: string): Promise<{ token: string; usuario: { id: number; nome: string; email: string } } | null> {
  const usuario = await knex('usuarios').where({ email }).first()
  if (!usuario || !usuario.ativo) return null
  const { token } = await criarTokenSenha(usuario.id, 'reset')
  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } }
}

type ResultadoSimples = { ok: true; usuarioId: number } | { ok: false; erro: string }

/** Vale para reset e para aceite de convite (mesmo mecanismo). */
export async function redefinirSenha(token: string, novaSenha: string): Promise<ResultadoSimples> {
  const minimo = await obterConfigNumero('senha_min_tamanho', 8)
  if (typeof novaSenha !== 'string' || novaSenha.length < minimo) {
    return { ok: false, erro: `a senha deve ter pelo menos ${minimo} caracteres` }
  }

  const tokenHash = hashToken(token)
  const linha = await knex('tokens_senha').where({ token_hash: tokenHash }).first()
  if (!linha || linha.usado_em || new Date(linha.expira_em).getTime() < Date.now()) {
    return { ok: false, erro: 'link inválido ou expirado' }
  }

  const senhaHash = await hashSenha(novaSenha)
  const alterado = await knex.transaction(async (trx) => {
    const usuario = await trx('usuarios').where({ id: linha.usuario_id }).forUpdate().first('id')
    if (!usuario) return false

    const consumidos = await trx('tokens_senha')
      .where({ id: linha.id, usuario_id: linha.usuario_id, token_hash: tokenHash })
      .whereNull('usado_em')
      .where('expira_em', '>', trx.fn.now())
      .update({ usado_em: new Date() })
    if (consumidos !== 1) return false

    await trx('usuarios').where({ id: linha.usuario_id }).update({ senha_hash: senhaHash })
    await trx('tokens_senha')
      .where({ usuario_id: linha.usuario_id })
      .whereNull('usado_em')
      .update({ usado_em: new Date() })
    await trx('sessoes').where({ usuario_id: linha.usuario_id }).del()
    return true
  })

  if (!alterado) return { ok: false, erro: 'link inválido ou expirado' }
  return { ok: true, usuarioId: linha.usuario_id }
}
