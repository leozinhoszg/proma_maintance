import type { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  await knex('chamados').del()
  await knex('chamados').insert([
    {
      maquina: 'Prensa Hidráulica 3', setor: 'Estamparia', tipo_problema: 'hidraulico',
      prioridade: 'urgente', descricao: 'Vazamento de óleo, máquina parada.',
      operador: 'Carlos Silva', maquina_parada: true, status: 'aberto',
    },
    {
      maquina: 'Esteira Transportadora 1', setor: 'Montagem', tipo_problema: 'mecanico',
      prioridade: 'alta', descricao: 'Correia desalinhada fazendo ruído.',
      operador: 'Ana Souza', maquina_parada: false, status: 'em_atendimento',
    },
    {
      maquina: 'Torno CNC 2', setor: 'Usinagem', tipo_problema: 'software',
      prioridade: 'media', descricao: 'Painel travando na inicialização.',
      operador: 'Pedro Lima', maquina_parada: false, status: 'aberto',
    },
    {
      maquina: 'Compressor Central', setor: 'Utilidades', tipo_problema: 'eletrico',
      prioridade: 'baixa', descricao: 'Lâmpada de sinalização queimada.',
      operador: 'Marina Costa', maquina_parada: false, status: 'concluido',
    },
  ])
}
