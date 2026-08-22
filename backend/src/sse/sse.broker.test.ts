import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  broadcast,
  closeAllConnections,
  closeSession,
  closeUser,
  contarConexoes,
  subscribe,
} from './sse.broker'

function fakeRes() {
  const handlers: Record<string, () => void> = {}
  return {
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    destroyed: false,
    writableEnded: false,
    flushHeaders: vi.fn(),
    on: (ev: string, cb: () => void) => { handlers[ev] = cb },
    _close: () => handlers['close']?.(),
  } as any
}

describe('sse.broker', () => {
  afterEach(() => closeAllConnections())

  it('registra conexão e escreve headers SSE', () => {
    const res = fakeRes()
    expect(subscribe(res, { sessionId: 1, userId: 1 })).toBe(true)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    res._close()
  })

  it('faz broadcast para conexões abertas', () => {
    const res = fakeRes()
    subscribe(res, { sessionId: 1, userId: 1 })
    broadcast('chamado:criado', { id: 1 })
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chamado:criado'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"id":1'))
    res._close()
  })

  it('remove a conexão ao fechar', () => {
    const res = fakeRes()
    subscribe(res, { sessionId: 1, userId: 1 })
    const antes = contarConexoes()
    res._close()
    expect(contarConexoes()).toBe(antes - 1)
  })

  it('fecha apenas a sessão revogada', () => {
    const revogada = fakeRes()
    const mantida = fakeRes()
    subscribe(revogada, { sessionId: 10, userId: 1 })
    subscribe(mantida, { sessionId: 11, userId: 1 })

    closeSession(10)

    expect(revogada.end).toHaveBeenCalledOnce()
    expect(mantida.end).not.toHaveBeenCalled()
    expect(contarConexoes()).toBe(1)
  })

  it('fecha todas as sessões do usuário revogado', () => {
    const primeira = fakeRes()
    const segunda = fakeRes()
    const outroUsuario = fakeRes()
    subscribe(primeira, { sessionId: 10, userId: 1 })
    subscribe(segunda, { sessionId: 11, userId: 1 })
    subscribe(outroUsuario, { sessionId: 12, userId: 2 })

    closeUser(1)

    expect(primeira.end).toHaveBeenCalledOnce()
    expect(segunda.end).toHaveBeenCalledOnce()
    expect(outroUsuario.end).not.toHaveBeenCalled()
    expect(contarConexoes()).toBe(1)
  })

  it('limita conexões por usuário antes de enviar headers', () => {
    const respostas = Array.from({ length: 6 }, () => fakeRes())
    for (const [index, res] of respostas.entries()) {
      const aceito = subscribe(res, { sessionId: index + 1, userId: 1 })
      expect(aceito).toBe(index < 5)
    }
    expect(respostas[5].setHeader).not.toHaveBeenCalled()
  })

  it('remove consumidor lento sem interromper os demais', () => {
    const lento = fakeRes()
    lento.write.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const saudavel = fakeRes()
    subscribe(lento, { sessionId: 1, userId: 1 })
    subscribe(saudavel, { sessionId: 2, userId: 2 })

    broadcast('chamado:criado', { id: 1 })

    expect(lento.end).toHaveBeenCalledOnce()
    expect(saudavel.write).toHaveBeenCalledWith(expect.stringContaining('chamado:criado'))
    expect(contarConexoes()).toBe(1)
  })
})
