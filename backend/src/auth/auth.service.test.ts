import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKnex = vi.fn()
vi.mock('../db/knex', () => ({ default: (t: string) => mockKnex(t) }))
vi.mock('../configuracoes/configuracoes.service', () => ({
  obterConfig: vi.fn().mockResolvedValue(''),
  obterConfigNumero: vi.fn().mockResolvedValue(12),
}))

import { login, validarSessao, redefinirSenha } from './auth.service'
import { hashSenha } from './senha'
import { gerarToken } from './tokens'

beforeEach(() => mockKnex.mockReset())

function builder(retornos: Record<string, unknown>) {
  const b: any = {
    where: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue([1]),
    update: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    first: vi.fn().mockResolvedValue(retornos.first),
  }
  return b
}

describe('login', () => {
  it('email inexistente e senha errada retornam a MESMA mensagem (anti-enumeração)', async () => {
    // email inexistente
    mockKnex.mockReturnValue(builder({ first: undefined }))
    const semUsuario = await login('nao@existe.com', 'x', {})
    // senha errada
    const hash = await hashSenha('senha-correta')
    mockKnex.mockReturnValue(builder({
      first: { id: 1, ativo: 1, senha_hash: hash, pode_abrir: 1 },
    }))
    const senhaErrada = await login('existe@proma.com', 'senha-errada', {})

    expect(semUsuario.ok).toBe(false)
    expect(senhaErrada.ok).toBe(false)
    if (!semUsuario.ok && !senhaErrada.ok) {
      expect(semUsuario.erro).toBe(senhaErrada.erro)
    }
  })

  it('usuário inativo não loga, mesmo com senha certa', async () => {
    const hash = await hashSenha('senha-correta')
    mockKnex.mockReturnValue(builder({
      first: { id: 1, ativo: 0, senha_hash: hash },
    }))
    const r = await login('existe@proma.com', 'senha-correta', {})
    expect(r.ok).toBe(false)
  })

  it('login válido cria sessão e devolve token', async () => {
    const hash = await hashSenha('senha-correta')
    const b = builder({
      first: {
        id: 7, nome: 'Ana', email: 'ana@proma.com', ativo: 1, senha_hash: hash,
        perfil_id: 2, perfil_nome: 'Atendente',
        pode_abrir: 1, pode_atender: 1, pode_administrar: 0,
      },
    })
    mockKnex.mockReturnValue(b)
    const r = await login('ana@proma.com', 'senha-correta', { ip: '10.0.0.1' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.token).toMatch(/^[0-9a-f]{64}$/)
      expect(r.usuario.email).toBe('ana@proma.com')
      expect(r.usuario.perfil.pode_atender).toBe(true)
      // nunca vazar o hash de senha
      expect(JSON.stringify(r.usuario)).not.toContain(hash)
    }
    expect(b.insert).toHaveBeenCalled()
  })
})

describe('validarSessao', () => {
  it('sessão expirada retorna null', async () => {
    mockKnex.mockReturnValue(builder({ first: undefined }))
    expect(await validarSessao(gerarToken().token)).toBeNull()
  })
})

describe('redefinirSenha', () => {
  it('token inexistente falha com mensagem genérica', async () => {
    mockKnex.mockReturnValue(builder({ first: undefined }))
    const r = await redefinirSenha(gerarToken().token, 'nova-senha-123')
    expect(r.ok).toBe(false)
  })
})
