import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, EVENTO_NAO_AUTORIZADO, apiEu, req } from './api'

function resposta(status: number, body?: unknown, jsonError?: Error): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jsonError
      ? vi.fn().mockRejectedValue(jsonError)
      : vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  it('preserva status, code e mensagem do backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      resposta(409, { error: 'estado desatualizado', code: 'STALE_STATE' }),
    ))
    await expect(req('/api/teste')).rejects.toMatchObject({
      status: 409, code: 'STALE_STATE', message: 'estado desatualizado',
    })
  })

  it('classifica falha de rede sem inventar status HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(req('/api/teste')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('rejeita resposta de sucesso que não contém JSON válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, undefined, new Error('json'))))
    await expect(req('/api/teste')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('retorna undefined para 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(204)))
    await expect(req('/api/teste')).resolves.toBeUndefined()
  })

  it('emite evento global ao receber 401', async () => {
    const listener = vi.fn()
    window.addEventListener(EVENTO_NAO_AUTORIZADO, listener, { once: true })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { error: 'não autenticado' })))
    await expect(req('/api/teste')).rejects.toBeInstanceOf(ApiError)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('apiEu retorna null somente para 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { error: 'não autenticado' })))
    await expect(apiEu()).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(apiEu()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
