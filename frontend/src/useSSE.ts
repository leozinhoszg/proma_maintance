import { useEffect, useRef } from 'react'
import type { Chamado } from './types'

interface Handlers {
  onCriado: (c: Chamado) => void
  onAtualizado: (c: Chamado) => void
}

export function useSSE(handlers: Handlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.addEventListener('chamado:criado', (e) =>
      ref.current.onCriado(JSON.parse((e as MessageEvent).data)),
    )
    es.addEventListener('chamado:atualizado', (e) =>
      ref.current.onAtualizado(JSON.parse((e as MessageEvent).data)),
    )
    return () => es.close()
  }, [])
}
