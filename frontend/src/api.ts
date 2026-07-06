import type { Chamado, NovoChamado, Status } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function listarChamados(): Promise<Chamado[]> {
  return fetch('/api/chamados').then(json<Chamado[]>)
}

export function criarChamado(dados: NovoChamado): Promise<Chamado> {
  return fetch('/api/chamados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  }).then(json<Chamado>)
}

export function atualizarStatus(id: number, status: Status): Promise<Chamado> {
  return fetch(`/api/chamados/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).then(json<Chamado>)
}
