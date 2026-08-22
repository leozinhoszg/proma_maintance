import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app, mapearErroHttp } from './app'

let server: Server
let baseUrl: string

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((erro) => erro ? reject(erro) : resolve())
  })
})

describe('contrato de erros HTTP', () => {
  it('retorna 400 INVALID_JSON para JSON malformado', async () => {
    const resposta = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    expect(resposta.status).toBe(400)
    await expect(resposta.json()).resolves.toMatchObject({ code: 'INVALID_JSON' })
  })

  it('retorna 413 PAYLOAD_TOO_LARGE acima de 100kb', async () => {
    const resposta = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${'a'.repeat(110_000)}@proma.local`, senha: 'x' }),
    })
    expect(resposta.status).toBe(413)
    await expect(resposta.json()).resolves.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
  })

  it('retorna 415 para content encoding não suportado', async () => {
    const resposta = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'unsupported' },
      body: '{}',
    })
    expect(resposta.status).toBe(415)
    await expect(resposta.json()).resolves.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' })
  })

  it('mantém exceções desconhecidas como 500 sem detalhes internos', () => {
    expect(mapearErroHttp(new Error('segredo interno'))).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      mensagem: 'erro interno',
    })
  })
})
