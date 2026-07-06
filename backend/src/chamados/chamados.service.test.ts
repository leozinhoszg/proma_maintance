import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKnex = vi.fn()
vi.mock('../db/knex', () => ({ default: (table: string) => mockKnex(table) }))

import { criarChamado, atualizarStatus } from './chamados.service'
import type { NovoChamado } from './chamados.types'

const novo: NovoChamado = {
  maquina: 'Prensa 3',
  setor: 'Estamparia',
  tipo_problema: 'mecanico',
  prioridade: 'alta',
  descricao: 'Ruído anormal',
  maquina_parada: true,
}

beforeEach(() => {
  mockKnex.mockReset()
})

function builder(first: unknown) {
  return {
    insert: vi.fn().mockResolvedValue([1]),
    where: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue(1),
    first: vi.fn().mockResolvedValue(first),
  } as any
}

describe('criarChamado', () => {
  it('grava o solicitante da sessão, não do payload', async () => {
    const b = builder({ id: 1, ...novo, solicitante_id: 42, status: 'aberto' })
    mockKnex.mockReturnValue(b)

    const result = await criarChamado(novo, 42)

    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({ maquina: 'Prensa 3', solicitante_id: 42 }),
    )
    expect(result.id).toBe(1)
  })
})

describe('atualizarStatus', () => {
  it('assumir grava o atendente logado', async () => {
    const b = builder({ id: 1, status: 'aberto' })
    mockKnex.mockReturnValue(b)

    await atualizarStatus(1, 'em_atendimento', 7)

    expect(b.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'em_atendimento', atendente_id: 7 }),
    )
  })

  it('concluir não sobrescreve o atendente', async () => {
    const b = builder({ id: 1, status: 'em_atendimento', atendente_id: 7 })
    mockKnex.mockReturnValue(b)

    await atualizarStatus(1, 'concluido', 99)

    expect(b.update).toHaveBeenCalledWith({ status: 'concluido' })
  })

  it('rejeita transição inválida', async () => {
    mockKnex.mockReturnValue(builder({ id: 1, status: 'aberto' }))
    await expect(atualizarStatus(1, 'concluido', 7)).rejects.toThrow('transicao invalida')
  })

  it('lança erro quando o chamado não existe', async () => {
    mockKnex.mockReturnValue(builder(undefined))
    await expect(atualizarStatus(999, 'em_atendimento', 7)).rejects.toThrow('chamado nao encontrado')
  })
})
