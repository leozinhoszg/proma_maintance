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
    fireEvent.change(screen.getByLabelText(/Operador/i), { target: { value: 'João' } })
    fireEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(await screen.findByText(/Chamado aberto/i)).toBeInTheDocument()
  })
})
