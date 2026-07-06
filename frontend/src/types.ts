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
  operador: string
  maquina_parada: boolean
  status: Status
  criado_em: string
  atualizado_em: string
}

export interface NovoChamado {
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  operador: string
  maquina_parada: boolean
}
