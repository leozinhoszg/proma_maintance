import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chamados', (t) => {
    t.increments('id').primary()
    t.string('maquina', 120).notNullable()
    t.string('setor', 120).notNullable()
    t.enum('tipo_problema', ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro']).notNullable()
    t.enum('prioridade', ['baixa', 'media', 'alta', 'urgente']).notNullable()
    t.text('descricao').notNullable()
    t.string('operador', 120).notNullable()
    t.boolean('maquina_parada').notNullable().defaultTo(false)
    t.enum('status', ['aberto', 'em_atendimento', 'concluido']).notNullable().defaultTo('aberto')
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
    t.timestamp('atualizado_em').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('chamados')
}
