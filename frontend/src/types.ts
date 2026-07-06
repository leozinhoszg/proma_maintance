export type TipoProblema = 'eletrico' | 'mecanico' | 'hidraulico' | 'software' | 'outro'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type Status = 'aberto' | 'em_atendimento' | 'concluido'

export interface Chamado {
  id: number
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  solicitante_id: number
  solicitante_nome: string
  atendente_id: number | null
  atendente_nome: string | null
  maquina_parada: boolean
  status: Status
  criado_em: string
  atualizado_em: string
}

/** O solicitante é o usuário logado — não vai no payload. */
export interface NovoChamado {
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  maquina_parada: boolean
}

export interface Perfil {
  id: number
  nome: string
  pode_abrir: boolean
  pode_atender: boolean
  pode_administrar: boolean
  total_usuarios?: number
}

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export interface UsuarioLista {
  id: number
  nome: string
  email: string
  ativo: boolean | 0 | 1
  perfil_id: number
  perfil_nome: string
  senha_definida: boolean | 0 | 1
  criado_em: string
}

export interface Configuracao {
  chave: string
  valor: string | null
  descricao: string
  secreta: boolean | 0 | 1
  atualizado_em: string
}
