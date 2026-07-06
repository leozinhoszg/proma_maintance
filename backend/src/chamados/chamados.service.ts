import knex from '../db/knex.js'
import {
  type Chamado,
  type NovoChamado,
  type Status,
  proximoStatusValido,
} from './chamados.types.js'

const TABELA = 'chamados'

export async function criarChamado(dados: NovoChamado): Promise<Chamado> {
  const [id] = await knex(TABELA).insert({ ...dados, status: 'aberto' })
  const criado = await knex(TABELA).where({ id }).first()
  return criado as Chamado
}

export async function listarChamados(status?: Status): Promise<Chamado[]> {
  const query = knex(TABELA).select('*')
  if (status) query.where({ status })
  return (await query.orderBy('criado_em', 'desc')) as Chamado[]
}

export async function buscarChamado(id: number): Promise<Chamado | undefined> {
  return (await knex(TABELA).where({ id }).first()) as Chamado | undefined
}

export async function atualizarStatus(id: number, novo: Status): Promise<Chamado> {
  const atual = (await knex(TABELA).where({ id }).first()) as Chamado | undefined
  if (!atual) throw new Error('chamado nao encontrado')
  if (!proximoStatusValido(atual.status, novo)) throw new Error('transicao invalida')
  await knex(TABELA).where({ id }).update({ status: novo })
  const atualizado = await knex(TABELA).where({ id }).first()
  return atualizado as Chamado
}
