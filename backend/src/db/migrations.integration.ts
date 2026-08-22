import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import knex, { type Knex } from 'knex'
import mysql from 'mysql2/promise'
import { afterEach, describe, expect, it } from 'vitest'
import * as migration001 from './migrations/001_create_chamados.js'
import * as migration002 from './migrations/002_auth_e_usuarios.js'

const host = process.env.DB_HOST ?? '127.0.0.1'
const port = Number(process.env.DB_PORT ?? 3306)
const user = process.env.DB_USER ?? 'root'
const password = process.env.DB_PASSWORD ?? ''
const databases = new Set<string>()

function databaseName(): string {
  return `proma_migration_test_${process.pid}_${randomBytes(4).toString('hex')}`
}

async function createDatabase(): Promise<{ db: Knex; name: string }> {
  const name = databaseName()
  const admin = await mysql.createConnection({ host, port, user, password })
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`)
  await admin.end()
  databases.add(name)

  return {
    name,
    db: knex({ client: 'mysql2', connection: { host, port, user, password, database: name } }),
  }
}

async function dropDatabase(name: string): Promise<void> {
  const admin = await mysql.createConnection({ host, port, user, password })
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``)
  await admin.end()
  databases.delete(name)
}

afterEach(async () => {
  for (const name of [...databases]) await dropDatabase(name)
})

async function insertLegacyRows(db: Knex): Promise<void> {
  await db('chamados').insert([
    {
      id: 10,
      maquina: 'Prensa 01',
      setor: 'Produção',
      tipo_problema: 'mecanico',
      prioridade: 'alta',
      descricao: 'Ruído no eixo',
      operador: 'Ana Souza',
      maquina_parada: true,
      status: 'aberto',
      criado_em: '2026-07-01 10:00:00',
      atualizado_em: '2026-07-01 10:30:00',
    },
    {
      id: 11,
      maquina: 'Prensa 02',
      setor: 'Produção',
      tipo_problema: 'eletrico',
      prioridade: 'media',
      descricao: 'Sensor intermitente',
      operador: 'Ana Souza',
      maquina_parada: false,
      status: 'em_atendimento',
      criado_em: '2026-07-02 11:00:00',
      atualizado_em: '2026-07-02 11:30:00',
    },
    {
      id: 12,
      maquina: 'Esteira 01',
      setor: 'Expedição',
      tipo_problema: 'software',
      prioridade: 'urgente',
      descricao: 'CLP sem comunicação',
      operador: 'ana souza',
      maquina_parada: true,
      status: 'concluido',
      criado_em: '2026-07-03 12:00:00',
      atualizado_em: '2026-07-03 12:30:00',
    },
  ])
}

function businessFields(rows: Array<Record<string, unknown>>) {
  return rows.map(({ operador: _operador, solicitante_id: _solicitante, atendente_id: _atendente, ...row }) => ({
    ...row,
    criado_em: new Date(row.criado_em as string | Date).toISOString(),
    atualizado_em: new Date(row.atualizado_em as string | Date).toISOString(),
  }))
}

describe('migrations MySQL', () => {
  it('executa os comandos documentados em uma instalação limpa', async () => {
    const { db, name } = await createDatabase()
    await db.destroy()
    const env = { ...process.env, DB_HOST: host, DB_PORT: String(port), DB_USER: user, DB_PASSWORD: password, DB_NAME: name }

    execFileSync('npm', ['run', 'migrate'], { cwd: process.cwd(), env, stdio: 'pipe' })
    execFileSync('npm', ['run', 'seed'], { cwd: process.cwd(), env, stdio: 'pipe' })

    const check = knex({ client: 'mysql2', connection: { host, port, user, password, database: name } })
    expect(await check.schema.hasTable('chamados')).toBe(true)
    expect(await check.schema.hasColumn('chamados', 'operador')).toBe(false)
    expect(await check.schema.hasColumn('chamados', 'solicitante_id')).toBe(true)
    expect(Number((await check('usuarios').count<{ total: number }[]>({ total: '*' }))[0].total)).toBe(3)
    expect(Number((await check('chamados').count<{ total: number }[]>({ total: '*' }))[0].total)).toBe(4)
    await check.destroy()
  })

  it('preserva chamados e atribuição no upgrade populado', async () => {
    const { db } = await createDatabase()
    await migration001.up(db)
    await insertLegacyRows(db)
    const before = await db('chamados').orderBy('id')

    await migration002.up(db)

    const after = await db('chamados').orderBy('id')
    expect(businessFields(after)).toEqual(businessFields(before))
    const atribuicoes = await db('chamados')
      .join('usuarios', 'chamados.solicitante_id', 'usuarios.id')
      .orderBy('chamados.id')
      .select('chamados.id', 'usuarios.nome', 'usuarios.ativo', 'usuarios.senha_hash')
    expect(atribuicoes.map(({ id, nome }) => ({ id, nome }))).toEqual([
      { id: 10, nome: 'Ana Souza' },
      { id: 11, nome: 'Ana Souza' },
      { id: 12, nome: 'ana souza' },
    ])
    expect(atribuicoes.every(({ ativo, senha_hash }) => !ativo && senha_hash === null)).toBe(true)
    expect(after[0].solicitante_id).toBe(after[1].solicitante_id)
    expect(after[0].solicitante_id).not.toBe(after[2].solicitante_id)
    await db.destroy()
  })

  it('restaura o schema legado e permite reaplicar a migration', async () => {
    const { db } = await createDatabase()
    await migration001.up(db)
    await insertLegacyRows(db)

    await migration002.up(db)
    await migration002.down(db)

    expect(await db.schema.hasColumn('chamados', 'operador')).toBe(true)
    expect(await db.schema.hasColumn('chamados', 'solicitante_id')).toBe(false)
    const rolledBack = await db('chamados').orderBy('id')
    expect(rolledBack.map(({ id, operador }) => ({ id, operador }))).toEqual([
      { id: 10, operador: 'Ana Souza' },
      { id: 11, operador: 'Ana Souza' },
      { id: 12, operador: 'ana souza' },
    ])

    await migration002.up(db)
    expect(await db.schema.hasColumn('chamados', 'operador')).toBe(false)
    expect(await db.schema.hasColumn('chamados', 'solicitante_id')).toBe(true)
    expect(Number((await db('chamados').count<{ total: number }[]>({ total: '*' }))[0].total)).toBe(3)
    await db.destroy()
  })
})
