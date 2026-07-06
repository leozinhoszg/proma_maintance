import type { Knex } from 'knex'

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

  // chamados refeitos: vínculo com usuários no lugar do texto livre
  await knex.schema.dropTableIfExists('chamados')
  await knex.schema.createTable('chamados', (t) => {
    t.increments('id').primary()
    t.string('maquina', 120).notNullable()
    t.string('setor', 120).notNullable()
    t.enum('tipo_problema', ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro']).notNullable()
    t.enum('prioridade', ['baixa', 'media', 'alta', 'urgente']).notNullable()
    t.text('descricao').notNullable()
    t.integer('solicitante_id').unsigned().notNullable().references('id').inTable('usuarios')
    t.integer('atendente_id').unsigned().nullable().references('id').inTable('usuarios')
    t.boolean('maquina_parada').notNullable().defaultTo(false)
    t.enum('status', ['aberto', 'em_atendimento', 'concluido']).notNullable().defaultTo('aberto')
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
    t.timestamp('atualizado_em').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chamados')
  await knex.schema.dropTableIfExists('configuracoes')
  await knex.schema.dropTableIfExists('tokens_senha')
  await knex.schema.dropTableIfExists('sessoes')
  await knex.schema.dropTableIfExists('usuarios')
  await knex.schema.dropTableIfExists('perfis')
}
