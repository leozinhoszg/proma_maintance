import { createHash } from 'node:crypto'
import type { Knex } from 'knex'

// MySQL commits DDL implicitly. Keep the data backfill transaction explicit
// instead of presenting the whole migration as atomic.
export const config = { transaction: false }

export async function up(knex: Knex): Promise<void> {
  // perfis dinâmicos — permissões gerenciáveis pelo admin
  await knex.schema.createTable('perfis', (t) => {
    t.increments('id').primary()
    t.string('nome', 60).notNullable().unique()
    t.boolean('pode_abrir').notNullable().defaultTo(false)
    t.boolean('pode_atender').notNullable().defaultTo(false)
    t.boolean('pode_administrar').notNullable().defaultTo(false)
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary()
    t.string('nome', 120).notNullable()
    t.string('email', 160).notNullable().unique()
    // nulo até o usuário aceitar o convite e definir a senha
    t.string('senha_hash', 100).nullable()
    t.integer('perfil_id').unsigned().notNullable().references('id').inTable('perfis')
    t.boolean('ativo').notNullable().defaultTo(true)
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
    t.timestamp('atualizado_em').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
  })

  // sessões: token opaco guardado apenas como hash sha-256
  await knex.schema.createTable('sessoes', (t) => {
    t.increments('id').primary()
    t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
    t.string('token_hash', 64).notNullable().unique()
    t.timestamp('expira_em').notNullable()
    t.string('ip', 45).nullable()
    t.string('user_agent', 255).nullable()
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
  })

  // tokens de definição de senha (convite de novo usuário e reset)
  await knex.schema.createTable('tokens_senha', (t) => {
    t.increments('id').primary()
    t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE')
    t.string('token_hash', 64).notNullable().unique()
    t.enum('tipo', ['convite', 'reset']).notNullable()
    t.timestamp('expira_em').notNullable()
    t.timestamp('usado_em').nullable()
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
  })

  // configurações dinâmicas do sistema — sem hardcode
  await knex.schema.createTable('configuracoes', (t) => {
    t.string('chave', 80).primary()
    t.text('valor').nullable()
    t.string('descricao', 255).notNullable()
    t.boolean('secreta').notNullable().defaultTo(false)
    t.timestamp('atualizado_em').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
  })

  await knex.raw(`
    ALTER TABLE \`chamados\`
      ADD COLUMN \`solicitante_id\` INT UNSIGNED NULL AFTER \`operador\`,
      ADD COLUMN \`atendente_id\` INT UNSIGNED NULL AFTER \`solicitante_id\`
  `)

  await knex.transaction(async (trx) => {
    const linhas = await trx<{ operador: string }>('chamados').select('operador')
    const operadores = [...new Set(linhas.map(({ operador }) => operador))]

    if (operadores.length === 0) return

    const [perfilId] = await trx('perfis').insert({
      nome: 'Solicitante legado',
      pode_abrir: true,
      pode_atender: false,
      pode_administrar: false,
    })

    for (const operador of operadores) {
      const hash = createHash('sha256').update(operador, 'utf8').digest('hex')
      const [usuarioId] = await trx('usuarios').insert({
        nome: operador,
        email: `legacy+${hash}@proma.invalid`,
        senha_hash: null,
        perfil_id: perfilId,
        ativo: false,
      })

      await trx.raw(
        `UPDATE \`chamados\`
         SET \`solicitante_id\` = ?,
             \`atualizado_em\` = \`atualizado_em\`
         WHERE BINARY \`operador\` = BINARY ?`,
        [usuarioId, operador],
      )
    }

    const naoMapeado = await trx('chamados').whereNull('solicitante_id').first('id')
    if (naoMapeado) throw new Error('nao foi possivel mapear todos os operadores legados')
  })

  await knex.raw(`
    ALTER TABLE \`chamados\`
      MODIFY COLUMN \`solicitante_id\` INT UNSIGNED NOT NULL,
      ADD CONSTRAINT \`chamados_solicitante_id_foreign\`
        FOREIGN KEY (\`solicitante_id\`) REFERENCES \`usuarios\` (\`id\`),
      ADD CONSTRAINT \`chamados_atendente_id_foreign\`
        FOREIGN KEY (\`atendente_id\`) REFERENCES \`usuarios\` (\`id\`),
      DROP COLUMN \`operador\`
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE \`chamados\`
      ADD COLUMN \`operador\` VARCHAR(120) NULL AFTER \`descricao\`
  `)

  await knex.transaction(async (trx) => {
    await trx.raw(`
      UPDATE \`chamados\` AS \`c\`
      INNER JOIN \`usuarios\` AS \`u\`
        ON \`u\`.\`id\` = \`c\`.\`solicitante_id\`
      SET \`c\`.\`operador\` = \`u\`.\`nome\`,
          \`c\`.\`atualizado_em\` = \`c\`.\`atualizado_em\`
    `)

    const naoMapeado = await trx('chamados').whereNull('operador').first('id')
    if (naoMapeado) throw new Error('nao foi possivel restaurar todos os operadores')
  })

  await knex.raw(`
    ALTER TABLE \`chamados\`
      DROP FOREIGN KEY \`chamados_solicitante_id_foreign\`,
      DROP FOREIGN KEY \`chamados_atendente_id_foreign\`,
      MODIFY COLUMN \`operador\` VARCHAR(120) NOT NULL,
      DROP COLUMN \`solicitante_id\`,
      DROP COLUMN \`atendente_id\`
  `)

  await knex.schema.dropTable('configuracoes')
  await knex.schema.dropTable('tokens_senha')
  await knex.schema.dropTable('sessoes')
  await knex.schema.dropTable('usuarios')
  await knex.schema.dropTable('perfis')
}
