import { describe, expect, it } from 'vitest'
import { validarNovo } from './chamados.routes'

const valido = {
  maquina: 'Prensa 01',
  setor: 'Produção',
  tipo_problema: 'mecanico',
  prioridade: 'alta',
  descricao: 'Ruído no eixo',
  maquina_parada: true,
}

describe('validarNovo', () => {
  it.each([undefined, null, [], 'texto', 42])('rejeita body não-objeto: %s', (body) => {
    expect(validarNovo(body)).toBe('body deve ser um objeto JSON')
  })

  it('aceita o contrato completo', () => {
    expect(validarNovo(valido)).toBeNull()
  })

  it('rejeita campo obrigatório vazio sem lançar exceção', () => {
    expect(validarNovo({ ...valido, descricao: '' })).toBe('campo obrigatorio: descricao')
  })
})
