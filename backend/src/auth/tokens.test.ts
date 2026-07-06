import { describe, it, expect } from 'vitest'
import { gerarToken, hashToken } from './tokens'

describe('tokens', () => {
  it('gera token de 64 hex chars com hash sha-256 correspondente', () => {
    const { token, hash } = gerarToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashToken(token))
  })

  it('tokens são únicos', () => {
    const a = gerarToken()
    const b = gerarToken()
    expect(a.token).not.toBe(b.token)
  })

  it('hash é determinístico e diferente do token', () => {
    const { token, hash } = gerarToken()
    expect(hashToken(token)).toBe(hash)
    expect(hash).not.toBe(token)
  })
})
