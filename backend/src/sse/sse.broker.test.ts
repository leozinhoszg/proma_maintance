import { describe, it, expect, vi } from 'vitest'
import { subscribe, broadcast, contarConexoes, encerrarConexoes } from './sse.broker'

function fakeRes() {
  const handlers: Record<string, () => void> = {}
  return {
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    flushHeaders: vi.fn(),
    on: (ev: string, cb: () => void) => { handlers[ev] = cb },
    _close: () => handlers['close']?.(),
  } as any
}

describe('sse.broker', () => {
  it('registra conexão e escreve headers SSE', () => {
    const res = fakeRes()
    subscribe(res)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    res._close()
  })

  it('faz broadcast para conexões abertas', () => {
    const res = fakeRes()
    subscribe(res)
    broadcast('chamado:criado', { id: 1 })
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chamado:criado'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"id":1'))
    res._close()
  })

  it('remove a conexão ao fechar', () => {
    const res = fakeRes()
    subscribe(res)
    const antes = contarConexoes()
    res._close()
    expect(contarConexoes()).toBe(antes - 1)
  })

  it('encerra todas as conexões durante o shutdown', () => {
    const primeira = fakeRes()
    const segunda = fakeRes()
    subscribe(primeira)
    subscribe(segunda)

    encerrarConexoes()

    expect(primeira.end).toHaveBeenCalledOnce()
    expect(segunda.end).toHaveBeenCalledOnce()
    expect(contarConexoes()).toBe(0)
  })
})
