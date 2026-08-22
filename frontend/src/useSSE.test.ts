import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSSE } from './useSSE'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, (e: any) => void> = {}
  closed = false
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) { FakeEventSource.instances.push(this) }
  addEventListener(ev: string, cb: (e: any) => void) { this.listeners[ev] = cb }
  close() { this.closed = true }
  emit(ev: string, data: unknown) { this.listeners[ev]?.({ data: JSON.stringify(data) }) }
  open() { this.onopen?.() }
  error() { this.onerror?.() }
}

beforeEach(() => {
  FakeEventSource.instances = []
  ;(globalThis as any).EventSource = FakeEventSource
})

describe('useSSE', () => {
  it('chama onCriado quando recebe chamado:criado', () => {
    const onCriado = vi.fn()
    const onAtualizado = vi.fn()
    renderHook(() => useSSE({ onCriado, onAtualizado }))

    FakeEventSource.instances[0].emit('chamado:criado', { id: 7 })
    expect(onCriado).toHaveBeenCalledWith({ id: 7 })
  })

  it('fecha a conexão no unmount', () => {
    const { unmount } = renderHook(() =>
      useSSE({ onCriado: vi.fn(), onAtualizado: vi.fn() }),
    )
    const es = FakeEventSource.instances[0]
    unmount()
    expect(es.closed).toBe(true)
  })

  it('notifica abertura e apenas uma desconexão por outage', () => {
    const onOpen = vi.fn()
    const onDisconnect = vi.fn()
    renderHook(() => useSSE({
      onCriado: vi.fn(), onAtualizado: vi.fn(), onOpen, onDisconnect,
    }))
    const es = FakeEventSource.instances[0]

    act(() => {
      es.open()
      es.error()
      es.error()
      es.open()
    })

    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })
})
