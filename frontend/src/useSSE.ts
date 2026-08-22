import { useEffect, useRef, useState } from 'react'
import type { Chamado } from './types'

interface Handlers {
  onCriado: (c: Chamado) => void
  onAtualizado: (c: Chamado) => void
  onOpen?: () => void
  onDisconnect?: () => void
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
    let desconectado = false
    es.onopen = () => {
      desconectado = false
      setConectado(true)
      ref.current.onOpen?.()
    }
    es.onerror = () => {
      setConectado(false)
      if (!desconectado) ref.current.onDisconnect?.()
      desconectado = true
    }
    es.addEventListener('chamado:criado', (e) => {
      try { ref.current.onCriado(JSON.parse((e as MessageEvent).data)) }
      catch { /* reconciliação REST corrige payload inválido */ }
    })
    es.addEventListener('chamado:atualizado', (e) => {
      try { ref.current.onAtualizado(JSON.parse((e as MessageEvent).data)) }
      catch { /* reconciliação REST corrige payload inválido */ }
    })
    return () => es.close()
  }, [])

  return conectado
}
