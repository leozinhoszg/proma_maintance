import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Chamado } from '../types'

const mocks = vi.hoisted(() => ({
  listarChamados: vi.fn(),
  atualizarStatus: vi.fn(),
  handlers: null as any,
}))

vi.mock('../api', () => ({
  listarChamados: mocks.listarChamados,
  atualizarStatus: mocks.atualizarStatus,
}))
vi.mock('../useSSE', () => ({
  useSSE: (handlers: any) => {
    mocks.handlers = handlers
    return true
  },
}))
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    usuario: { perfil: { pode_atender: true } },
  }),
}))

import { PainelManutencao } from './PainelManutencao'

const chamado: Chamado = {
  id: 1,
  maquina: 'Prensa 01',
  setor: 'Produção',
  tipo_problema: 'mecanico',
  prioridade: 'alta',
  descricao: 'Ruído no eixo',
  solicitante_id: 1,
  solicitante_nome: 'Carlos',
  atendente_id: null,
  atendente_nome: null,
  maquina_parada: true,
  status: 'aberto',
  criado_em: '2026-08-22T10:00:00.000Z',
  atualizado_em: '2026-08-22T10:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function renderPainel() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PainelManutencao />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.listarChamados.mockReset()
  mocks.atualizarStatus.mockReset()
  mocks.handlers = null
})

describe('PainelManutencao', () => {
  it('não mostra fila vazia antes de um snapshot válido', async () => {
    const carga = deferred<Chamado[]>()
    mocks.listarChamados.mockReturnValue(carga.promise)
    renderPainel()

    expect(screen.getByText(/Carregando chamados/i)).toBeInTheDocument()
    expect(screen.queryByText(/fila limpa/i)).not.toBeInTheDocument()
    await act(async () => { carga.resolve([]); await carga.promise })
    expect(await screen.findByText(/fila limpa/i)).toBeInTheDocument()
  })

  it('mostra erro sem declarar fila limpa', async () => {
    mocks.listarChamados.mockRejectedValue(new Error('backend indisponível'))
    renderPainel()

    expect(await screen.findByRole('alert')).toHaveTextContent('backend indisponível')
    expect(screen.queryByText(/fila limpa/i)).not.toBeInTheDocument()
  })

  it('reaplica evento SSE recebido durante o snapshot inicial', async () => {
    const carga = deferred<Chamado[]>()
    mocks.listarChamados.mockReturnValue(carga.promise)
    renderPainel()
    act(() => mocks.handlers.onCriado(chamado))
    await act(async () => { carga.resolve([]); await carga.promise })

    expect(await screen.findByText('Prensa 01')).toBeInTheDocument()
  })

  it('reconcilia novamente ao abrir ou reconectar o SSE', async () => {
    mocks.listarChamados.mockResolvedValueOnce([]).mockResolvedValueOnce([chamado])
    renderPainel()
    expect(await screen.findByText(/fila limpa/i)).toBeInTheDocument()
    await act(async () => { await mocks.handlers.onOpen() })

    expect(await screen.findByText('Prensa 01')).toBeInTheDocument()
    expect(mocks.listarChamados).toHaveBeenCalledTimes(2)
  })

  it('aplica a resposta do PATCH e bloqueia cliques repetidos', async () => {
    const atualizado = { ...chamado, status: 'em_atendimento' as const, atendente_id: 2, atendente_nome: 'Ana' }
    const mutacao = deferred<Chamado>()
    mocks.listarChamados.mockResolvedValue([chamado])
    mocks.atualizarStatus.mockReturnValue(mutacao.promise)
    renderPainel()
    const assumir = await screen.findByRole('button', { name: 'Assumir' })
    fireEvent.click(assumir)
    fireEvent.click(assumir)

    expect(mocks.atualizarStatus).toHaveBeenCalledTimes(1)
    await act(async () => { mutacao.resolve(atualizado); await mutacao.promise })
    fireEvent.click(screen.getByRole('tab', { name: /Em atendimento/i }))
    expect(await screen.findByText('Prensa 01')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Concluir' })).toBeEnabled())
  })
})
