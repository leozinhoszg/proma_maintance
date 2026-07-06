import type { Knex } from 'knex'
import bcrypt from 'bcryptjs'

export async function seed(knex: Knex): Promise<void> {
  // ordem inversa das FKs
  await knex('chamados').del()
  await knex('tokens_senha').del()
  await knex('sessoes').del()
  await knex('usuarios').del()
  await knex('perfis').del()
  await knex('configuracoes').del()

  // ---- perfis iniciais (admin pode criar outros) ----
  const [perfilSolicitante] = await knex('perfis').insert({
    nome: 'Solicitante', pode_abrir: true, pode_atender: false, pode_administrar: false,
  })
  const [perfilAtendente] = await knex('perfis').insert({
    nome: 'Atendente', pode_abrir: true, pode_atender: true, pode_administrar: false,
  })
  const [perfilAdmin] = await knex('perfis').insert({
    nome: 'Admin', pode_abrir: true, pode_atender: true, pode_administrar: true,
  })

  // ---- usuários iniciais (admin vem do .env; demais são exemplos de dev) ----
  const hash = (s: string) => bcrypt.hashSync(s, 12)
  const [adminId] = await knex('usuarios').insert({
    nome: process.env.ADMIN_NOME ?? 'Administrador',
    email: process.env.ADMIN_EMAIL ?? 'admin@proma.local',
    senha_hash: hash(process.env.ADMIN_SENHA ?? 'admin1234'),
    perfil_id: perfilAdmin,
  })
  const [atendenteId] = await knex('usuarios').insert({
    nome: 'Ana Souza', email: 'ana.souza@proma.local',
    senha_hash: hash('atendente1234'), perfil_id: perfilAtendente,
  })
  const [solicitanteId] = await knex('usuarios').insert({
    nome: 'Carlos Silva', email: 'carlos.silva@proma.local',
    senha_hash: hash('solicitante1234'), perfil_id: perfilSolicitante,
  })

  // ---- configurações dinâmicas (editáveis pelo admin, sem restart) ----
  await knex('configuracoes').insert([
    { chave: 'app_url', valor: 'http://localhost:5173', descricao: 'URL pública do frontend (usada nos links de e-mail)' },
    { chave: 'smtp_host', valor: '', descricao: 'Servidor SMTP (vazio = e-mails simulados no console)' },
    { chave: 'smtp_porta', valor: '587', descricao: 'Porta SMTP (587 STARTTLS, 465 TLS)' },
    { chave: 'smtp_usuario', valor: '', descricao: 'Usuário/login do SMTP' },
    { chave: 'smtp_senha', valor: '', descricao: 'Senha do SMTP', secreta: true },
    { chave: 'smtp_remetente', valor: 'Manutenção PROMA <manutencao@proma.local>', descricao: 'Remetente dos e-mails do sistema' },
    { chave: 'sessao_duracao_horas', valor: '12', descricao: 'Duração da sessão de login (horas)' },
    { chave: 'reset_validade_min', valor: '30', descricao: 'Validade do link de redefinição de senha (minutos)' },
    { chave: 'convite_validade_horas', valor: '168', descricao: 'Validade do link de convite de novo usuário (horas)' },
    { chave: 'senha_min_tamanho', valor: '8', descricao: 'Tamanho mínimo de senha' },
  ])

  // ---- chamados de exemplo, já vinculados a usuários ----
  await knex('chamados').insert([
    {
      maquina: 'Prensa Hidráulica 3', setor: 'Estamparia', tipo_problema: 'hidraulico',
      prioridade: 'urgente', descricao: 'Vazamento de óleo, máquina parada.',
      solicitante_id: solicitanteId, maquina_parada: true, status: 'aberto',
    },
    {
      maquina: 'Esteira Transportadora 1', setor: 'Montagem', tipo_problema: 'mecanico',
      prioridade: 'alta', descricao: 'Correia desalinhada fazendo ruído.',
      solicitante_id: solicitanteId, atendente_id: atendenteId,
      maquina_parada: false, status: 'em_atendimento',
    },
    {
      maquina: 'Torno CNC 2', setor: 'Usinagem', tipo_problema: 'software',
      prioridade: 'media', descricao: 'Painel travando na inicialização.',
      solicitante_id: adminId, maquina_parada: false, status: 'aberto',
    },
    {
      maquina: 'Compressor Central', setor: 'Utilidades', tipo_problema: 'eletrico',
      prioridade: 'baixa', descricao: 'Lâmpada de sinalização queimada.',
      solicitante_id: solicitanteId, atendente_id: atendenteId,
      maquina_parada: false, status: 'concluido',
    },
  ])
}
