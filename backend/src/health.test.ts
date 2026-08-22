import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { app } from './app'

describe('GET /healthz', () => {
  it('responde sem consultar dependências externas', async () => {
    const server = app.listen(0, '127.0.0.1')

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('listening', resolve)
        server.once('error', reject)
      })
      const { port } = server.address() as AddressInfo
      const resposta = await fetch(`http://127.0.0.1:${port}/healthz`)

      expect(resposta.status).toBe(200)
      expect(resposta.headers.get('cache-control')).toBe('no-store')
      await expect(resposta.json()).resolves.toEqual({ status: 'ok' })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(erro => erro ? reject(erro) : resolve())
      })
    }
  })
})
