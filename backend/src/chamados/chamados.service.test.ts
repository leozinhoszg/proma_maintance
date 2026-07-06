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
  operador: 'João',
  maquina_parada: true,
}

beforeEach(() => {
  mockKnex.mockReset()
})

describe('criarChamado', () => {
  it('insere e retorna o chamado criado', async () => {
    const inserted = { ...novo, id: 1, status: 'aberto', criado_em: 'x', atualizado_em: 'x' }
    const builder: any = {
      insert: vi.fn().mockResolvedValue([1]),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(inserted),
    }
    mockKnex.mockReturnValue(builder)

    const result = await criarChamado(novo)

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ maquina: 'Prensa 3' }))
    expect(result.id).toBe(1)
    expect(result.status).toBe('aberto')
  })
})

describe('atualizarStatus', () => {
  it('rejeita transição inválida', async () => {
    const builder: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 1, status: 'aberto' }),
    }
    mockKnex.mockReturnValue(builder)

    await expect(atualizarStatus(1, 'concluido')).rejects.toThrow('transicao invalida')
  })

  it('lança erro quando o chamado não existe', async () => {
    const builder: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(undefined),
    }
    mockKnex.mockReturnValue(builder)

    await expect(atualizarStatus(999, 'em_atendimento')).rejects.toThrow('chamado nao encontrado')
  })
})
