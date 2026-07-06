import { describe, it, expect } from 'vitest'
import { ordenarFila, tempoRelativo } from './fila'
import type { Chamado } from './types'

function ch(over: Partial<Chamado>): Chamado {
  return {
    id: 1, maquina: 'M', setor: 'S', tipo_problema: 'outro', prioridade: 'media',
    descricao: '', operador: 'O', maquina_parada: false, status: 'aberto',
    criado_em: '2026-07-06T08:00:00Z', atualizado_em: '2026-07-06T08:00:00Z',
    ...over,
  }
}

describe('ordenarFila — parada > prioridade > chegada', () => {
  it('máquina parada vem antes, mesmo com prioridade menor', () => {
    const naoParada = ch({ id: 1, prioridade: 'urgente', maquina_parada: false })
    const parada = ch({ id: 2, prioridade: 'baixa', maquina_parada: true })
    expect(ordenarFila([naoParada, parada]).map((c) => c.id)).toEqual([2, 1])
  })

  it('prioridade maior vem antes no mesmo estado de parada', () => {
    const media = ch({ id: 1, prioridade: 'media' })
    const urgente = ch({ id: 2, prioridade: 'urgente' })
    const baixa = ch({ id: 3, prioridade: 'baixa' })
    expect(ordenarFila([media, urgente, baixa]).map((c) => c.id)).toEqual([2, 1, 3])
  })

  it('empate de prioridade: quem abriu primeiro vem antes (FIFO)', () => {
    const depois = ch({ id: 1, criado_em: '2026-07-06T09:00:00Z' })
    const antes = ch({ id: 2, criado_em: '2026-07-06T08:00:00Z' })
    expect(ordenarFila([depois, antes]).map((c) => c.id)).toEqual([2, 1])
  })

  it('não modifica o array original', () => {
    const lista = [ch({ id: 1, prioridade: 'baixa' }), ch({ id: 2, prioridade: 'urgente' })]
    ordenarFila(lista)
    expect(lista.map((c) => c.id)).toEqual([1, 2])
  })
})

describe('tempoRelativo', () => {
  const agora = new Date('2026-07-06T10:00:00Z').getTime()

  it('menos de 1 minuto → agora mesmo', () => {
    expect(tempoRelativo('2026-07-06T09:59:40Z', agora)).toBe('agora mesmo')
  })
  it('minutos', () => {
    expect(tempoRelativo('2026-07-06T09:45:00Z', agora)).toBe('há 15 min')
  })
  it('horas e minutos', () => {
    expect(tempoRelativo('2026-07-06T07:45:00Z', agora)).toBe('há 2h 15min')
  })
  it('hora exata sem resto', () => {
    expect(tempoRelativo('2026-07-06T08:00:00Z', agora)).toBe('há 2h')
  })
  it('dias', () => {
    expect(tempoRelativo('2026-07-04T08:00:00Z', agora)).toBe('há 2d 2h')
  })
  it('data inválida → vazio', () => {
    expect(tempoRelativo('xxx', agora)).toBe('')
  })
})
