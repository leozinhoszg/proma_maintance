import knex from '../db/knex.js'

export interface Configuracao {
  chave: string
  valor: string | null
  descricao: string
  secreta: boolean
  atualizado_em: string
}

/** Lê uma configuração do banco a cada uso — mudanças valem sem restart. */
export async function obterConfig(chave: string, padrao = ''): Promise<string> {
  const linha = await knex('configuracoes').where({ chave }).first()
  const valor = (linha as Configuracao | undefined)?.valor
  return valor == null || valor === '' ? padrao : valor
}

export async function obterConfigNumero(chave: string, padrao: number): Promise<number> {
  const valor = Number(await obterConfig(chave, String(padrao)))
  return Number.isFinite(valor) && valor > 0 ? valor : padrao
}

export async function listarConfigs(): Promise<Configuracao[]> {
  return (await knex('configuracoes').orderBy('chave')) as Configuracao[]
}

export async function definirConfig(chave: string, valor: string): Promise<boolean> {
  const alteradas = await knex('configuracoes').where({ chave }).update({ valor })
  return alteradas > 0
}
