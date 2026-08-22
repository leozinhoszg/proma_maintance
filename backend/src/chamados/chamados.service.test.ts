import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockKnex } = vi.hoisted(() => ({ mockKnex: vi.fn() }))
vi.mock('../db/knex', () => ({ default: mockKnex }))

import {
  ChamadoNaoEncontradoError,
  TransicaoChamadoConflitanteError,
  criarChamado,
  atualizarStatus,
} from './chamados.service'
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
  ;(mockKnex as any).transaction = vi.fn(async (callback) => callback(mockKnex))
})

function builder(first: unknown, updated = 1) {
  return {
    insert: vi.fn().mockResolvedValue([1]),
    where: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue(updated),
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

    expect(b.where).toHaveBeenCalledWith({ id: 1, status: 'aberto' })
    expect(b.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'em_atendimento', atendente_id: 7 }),
    )
  })

  it('concluir não sobrescreve o atendente', async () => {
    const b = builder({ id: 1, status: 'em_atendimento', atendente_id: 7 })
    mockKnex.mockReturnValue(b)

    await atualizarStatus(1, 'concluido', 99)

    expect(b.where).toHaveBeenCalledWith({ id: 1, status: 'em_atendimento' })
    expect(b.update).toHaveBeenCalledWith({ status: 'concluido' })
  })

  it('rejeita transição perdida para outro request', async () => {
    mockKnex.mockReturnValue(builder({ id: 1 }, 0))
    await expect(atualizarStatus(1, 'em_atendimento', 7)).rejects.toBeInstanceOf(
      TransicaoChamadoConflitanteError,
    )
  })

  it('rejeita retorno ao estado aberto', async () => {
    await expect(atualizarStatus(1, 'aberto', 7)).rejects.toBeInstanceOf(
      TransicaoChamadoConflitanteError,
    )
  })

  it('lança erro quando o chamado não existe', async () => {
    mockKnex.mockReturnValue(builder(undefined, 0))
    await expect(atualizarStatus(999, 'em_atendimento', 7)).rejects.toBeInstanceOf(
      ChamadoNaoEncontradoError,
    )
  })
})
