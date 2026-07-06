import { useEffect, useRef, useState } from 'react'
import type { Chamado } from './types'

interface Handlers {
  onCriado: (c: Chamado) => void
  onAtualizado: (c: Chamado) => void
}

/**
 * Conecta no stream SSE do backend e devolve o estado da conexão
 * (true = recebendo eventos ao vivo).
 */
export function useSSE(handlers: Handlers): boolean {
  const ref = useRef(handlers)
  ref.current = handlers
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onopen = () => setConectado(true)
    es.onerror = () => setConectado(false)
    es.addEventListener('chamado:criado', (e) =>
      ref.current.onCriado(JSON.parse((e as MessageEvent).data)),
    )
    es.addEventListener('chamado:atualizado', (e) =>
      ref.current.onAtualizado(JSON.parse((e as MessageEvent).data)),
    )
    return () => es.close()
  }, [])

  return conectado
}
