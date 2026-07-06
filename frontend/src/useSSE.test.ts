import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSSE } from './useSSE'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, (e: any) => void> = {}
  closed = false
  constructor(public url: string) { FakeEventSource.instances.push(this) }
  addEventListener(ev: string, cb: (e: any) => void) { this.listeners[ev] = cb }
  close() { this.closed = true }
  emit(ev: string, data: unknown) { this.listeners[ev]?.({ data: JSON.stringify(data) }) }
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
})
