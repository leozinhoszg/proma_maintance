import type { Response } from 'express'

const conexoes = new Set<Response>()

export function subscribe(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write(': conectado\n\n')

  conexoes.add(res)
  res.on('close', () => {
    conexoes.delete(res)
  })
}

export function broadcast(evento: string, dados: unknown): void {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`
  for (const res of conexoes) {
    res.write(payload)
  }
}

export function contarConexoes(): number {
  return conexoes.size
}

export function encerrarConexoes(): void {
  for (const res of conexoes) {
    res.end()
  }
  conexoes.clear()
}
