import type { Response } from 'express'

interface IdentidadeSSE {
  sessionId: number
  userId: number
}

const conexoes = new Map<Response, IdentidadeSSE>()

function limite(nome: string, fallback: number): number {
  const valor = Number(process.env[nome])
  return Number.isInteger(valor) && valor > 0 ? valor : fallback
}

function remover(res: Response): void {
  conexoes.delete(res)
}

function fechar(res: Response): void {
  remover(res)
  if (!res.writableEnded) res.end()
}

function escrever(res: Response, payload: string): boolean {
  if (res.destroyed || res.writableEnded || res.write(payload) === false) {
    fechar(res)
    return false
  }
  return true
}

export function subscribe(res: Response, identidade: IdentidadeSSE): boolean {
  if (conexoes.size >= limite('SSE_MAX_CONNECTIONS', 500)) return false
  const porUsuario = [...conexoes.values()].filter(({ userId }) => userId === identidade.userId).length
  if (porUsuario >= limite('SSE_MAX_CONNECTIONS_PER_USER', 5)) return false

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  conexoes.set(res, identidade)
  escrever(res, ': conectado\n\n')
  res.on('close', () => remover(res))
  res.on('error', () => remover(res))
  return true
}

export function keepAlive(res: Response): void {
  if (conexoes.has(res)) escrever(res, ': keep-alive\n\n')
}

export function broadcast(evento: string, dados: unknown): void {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`
  for (const res of conexoes.keys()) escrever(res, payload)
}

export function closeSession(sessionId: number): void {
  for (const [res, identidade] of conexoes) {
    if (identidade.sessionId === sessionId) fechar(res)
  }
}

export function closeUser(userId: number): void {
  for (const [res, identidade] of conexoes) {
    if (identidade.userId === userId) fechar(res)
  }
}

export function closeUsers(userIds: Iterable<number>): void {
  const ids = new Set(userIds)
  for (const [res, identidade] of conexoes) {
    if (ids.has(identidade.userId)) fechar(res)
  }
}

export function closeAllConnections(): void {
  for (const res of [...conexoes.keys()]) fechar(res)
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
