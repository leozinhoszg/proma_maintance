import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AbrirChamado } from './AbrirChamado'
import * as api from '../api'

beforeEach(() => vi.restoreAllMocks())

describe('AbrirChamado', () => {
  it('envia o formulário e mostra confirmação', async () => {
    const spy = vi.spyOn(api, 'criarChamado').mockResolvedValue({ id: 1 } as any)
    render(<AbrirChamado />)

    fireEvent.change(screen.getByLabelText(/^Máquina$/i), { target: { value: 'Prensa 3' } })
    fireEvent.change(screen.getByLabelText(/Setor/i), { target: { value: 'Estamparia' } })
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Ruído' } })
    fireEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(await screen.findByText(/Chamado aberto/i)).toBeInTheDocument()
  })

  it('bloqueia envios repetidos enquanto a requisição está pendente', async () => {
    let concluir!: (valor: any) => void
    const pendente = new Promise((resolve) => { concluir = resolve })
    const spy = vi.spyOn(api, 'criarChamado').mockReturnValue(pendente as any)
    render(<AbrirChamado />)

    fireEvent.change(screen.getByLabelText(/^Máquina$/i), { target: { value: 'Prensa 3' } })
    fireEvent.change(screen.getByLabelText(/Setor/i), { target: { value: 'Estamparia' } })
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Ruído' } })
    const form = screen.getByRole('button', { name: /Abrir chamado/i }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Abrindo/i })).toBeDisabled()
    concluir({ id: 2 })
    expect(await screen.findByText(/OS-002/i)).toBeInTheDocument()
  })

  it('mantém os dados e reabilita o botão quando falha', async () => {
    vi.spyOn(api, 'criarChamado').mockRejectedValue(new Error('Servidor indisponível'))
    render(<AbrirChamado />)
    const maquina = screen.getByLabelText(/^Máquina$/i)
    fireEvent.change(maquina, { target: { value: 'Prensa 3' } })
    fireEvent.change(screen.getByLabelText(/Setor/i), { target: { value: 'Estamparia' } })
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Ruído' } })
    fireEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível')
    expect(maquina).toHaveValue('Prensa 3')
    expect(screen.getByRole('button', { name: /Abrir chamado/i })).toBeEnabled()
  })
})
