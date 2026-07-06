import type { Chamado } from './types'

const PESO_PRIORIDADE: Record<Chamado['prioridade'], number> = {
  urgente: 0, alta: 1, media: 2, baixa: 3,
}

/**
 * Regra da fila de atendimento (documentada em "Como usar"):
 * 1. Máquina parada primeiro — produção interrompida é perda direta.
 * 2. Prioridade: urgente > alta > média > baixa.
 * 3. Ordem de chegada (FIFO): em empate, quem abriu primeiro é atendido primeiro.
 */
export function ordenarFila(chamados: Chamado[]): Chamado[] {
  return [...chamados].sort((a, b) => {
    if (a.maquina_parada !== b.maquina_parada) return a.maquina_parada ? -1 : 1
    const porPrioridade = PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]
    if (porPrioridade !== 0) return porPrioridade
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  })
}

/** Tempo decorrido em linguagem de gente: "há 15 min", "há 2h 15min", "há 2d 2h". */
export function tempoRelativo(iso: string, agora: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const min = Math.max(0, Math.floor((agora - t) / 60000))
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) {
    const resto = min % 60
    return resto > 0 ? `há ${h}h ${resto}min` : `há ${h}h`
  }
  const d = Math.floor(h / 24)
  return `há ${d}d ${h % 24}h`
}
