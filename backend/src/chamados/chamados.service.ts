import knex from '../db/knex.js'
import {
  type Chamado,
  type NovoChamado,
  type Status,
  proximoStatusValido,
} from './chamados.types.js'

const TABELA = 'chamados'

const CAMPOS = [
  'chamados.*',
  'solicitante.nome as solicitante_nome',
  'atendente.nome as atendente_nome',
]

function comNomes() {
  return knex(TABELA)
    .join('usuarios as solicitante', 'chamados.solicitante_id', 'solicitante.id')
    .leftJoin('usuarios as atendente', 'chamados.atendente_id', 'atendente.id')
    .select(CAMPOS)
}

export async function criarChamado(dados: NovoChamado, solicitanteId: number): Promise<Chamado> {
  const [id] = await knex(TABELA).insert({ ...dados, solicitante_id: solicitanteId, status: 'aberto' })
  return (await comNomes().where({ 'chamados.id': id }).first()) as Chamado
}

export async function listarChamados(status?: Status): Promise<Chamado[]> {
  const query = comNomes()
  if (status) query.where({ 'chamados.status': status })
  return (await query.orderBy('chamados.criado_em', 'desc')) as Chamado[]
}

export async function atualizarStatus(id: number, novo: Status, usuarioId: number): Promise<Chamado> {
  const atual = await knex(TABELA).where({ id }).first()
  if (!atual) throw new Error('chamado nao encontrado')
  if (!proximoStatusValido(atual.status, novo)) throw new Error('transicao invalida')

  // assumir registra quem atende; concluir preserva o atendente original
  const mudancas: Record<string, unknown> = { status: novo }
  if (novo === 'em_atendimento') mudancas.atendente_id = usuarioId
  await knex(TABELA).where({ id }).update(mudancas)

  return (await comNomes().where({ 'chamados.id': id }).first()) as Chamado
}
