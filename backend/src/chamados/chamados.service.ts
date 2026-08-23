import knex from '../db/knex.js'
import type { Knex } from 'knex'
import {
  type Chamado,
  type NovoChamado,
  type Status,
} from './chamados.types.js'

const TABELA = 'chamados'

const CAMPOS = [
  'chamados.*',
  'solicitante.nome as solicitante_nome',
  'atendente.nome as atendente_nome',
]

function comNomes(db: Knex | Knex.Transaction = knex) {
  return db(TABELA)
    .join('usuarios as solicitante', 'chamados.solicitante_id', 'solicitante.id')
    .leftJoin('usuarios as atendente', 'chamados.atendente_id', 'atendente.id')
    .select(CAMPOS)
}

export class ChamadoNaoEncontradoError extends Error {
  constructor() {
    super('chamado nao encontrado')
  }
}

export class TransicaoChamadoConflitanteError extends Error {
  constructor() {
    super('transicao invalida ou estado desatualizado')
  }
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
  if (novo === 'aberto') throw new TransicaoChamadoConflitanteError()

  const statusAtual: Status = novo === 'em_atendimento' ? 'aberto' : 'em_atendimento'
  const mudancas: Record<string, unknown> = { status: novo }
  if (novo === 'em_atendimento') mudancas.atendente_id = usuarioId

  return knex.transaction(async (trx) => {
    const alterados = await trx(TABELA).where({ id, status: statusAtual }).update(mudancas)
    if (alterados === 0) {
      const existente = await trx(TABELA).where({ id }).first('id')
      if (!existente) throw new ChamadoNaoEncontradoError()
      throw new TransicaoChamadoConflitanteError()
    }

    return (await comNomes(trx).where({ 'chamados.id': id }).first()) as Chamado
  })
}
