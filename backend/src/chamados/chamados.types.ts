export const TIPOS_PROBLEMA = ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro'] as const
export const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'] as const
export const STATUSES = ['aberto', 'em_atendimento', 'concluido'] as const

export type TipoProblema = (typeof TIPOS_PROBLEMA)[number]
export type Prioridade = (typeof PRIORIDADES)[number]
export type Status = (typeof STATUSES)[number]

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

const TRANSICOES: Record<Status, Status[]> = {
  aberto: ['em_atendimento'],
  em_atendimento: ['concluido'],
  concluido: [],
}

export function proximoStatusValido(atual: Status, novo: Status): boolean {
  return TRANSICOES[atual].includes(novo)
}
