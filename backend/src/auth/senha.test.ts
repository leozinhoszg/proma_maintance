import { describe, it, expect } from 'vitest'
import { hashSenha, verificarSenha } from './senha'

describe('senha', () => {
  it('hash e verificação corretos', async () => {
    const hash = await hashSenha('minha-senha-123')
    expect(hash).not.toContain('minha-senha-123')
    expect(await verificarSenha('minha-senha-123', hash)).toBe(true)
  })

  it('senha errada não verifica', async () => {
    const hash = await hashSenha('minha-senha-123')
    expect(await verificarSenha('outra-senha', hash)).toBe(false)
  })

  it('hash nulo (usuário sem senha definida) nunca verifica', async () => {
    expect(await verificarSenha('qualquer', null)).toBe(false)
  })
})
