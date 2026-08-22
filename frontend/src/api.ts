import type {
  Chamado, NovoChamado, Status, Usuario, UsuarioLista, Perfil, Configuracao,
} from './types'

export const EVENTO_NAO_AUTORIZADO = 'proma:nao-autorizado'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function req<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...resto } = init ?? {}
  let res: Response
  try {
    res = await fetch(url, {
      ...resto,
      headers: json !== undefined
        ? { 'Content-Type': 'application/json', ...resto.headers }
        : resto.headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    })
  } catch (cause) {
    throw new ApiError('Não foi possível conectar ao servidor', 0, 'NETWORK_ERROR', cause)
  }

  if (res.status === 204) return undefined as T
  let body: unknown
  try {
    body = await res.json()
  } catch (cause) {
    if (res.ok) throw new ApiError('Resposta inválida do servidor', res.status, 'INVALID_RESPONSE', cause)
    body = {}
  }

  if (!res.ok) {
    const erro = body as { error?: string; code?: string }
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_NAO_AUTORIZADO))
    }
    throw new ApiError(erro.error ?? `Erro ${res.status}`, res.status, erro.code)
  }
  return body as T
}

// ---- auth ----
export function apiLogin(email: string, senha: string): Promise<{ usuario: Usuario }> {
  return req('/api/auth/login', { method: 'POST', json: { email, senha } })
}
export function apiLogout(): Promise<void> {
  return req('/api/auth/logout', { method: 'POST' })
}
export async function apiEu(): Promise<Usuario | null> {
  try {
    const r = await req<{ usuario: Usuario }>('/api/auth/eu')
    return r.usuario
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}
export function apiEsqueciSenha(email: string): Promise<{ mensagem: string }> {
  return req('/api/auth/esqueci-senha', { method: 'POST', json: { email } })
}
export function apiRedefinirSenha(token: string, senha: string): Promise<{ ok: true }> {
  return req('/api/auth/redefinir-senha', { method: 'POST', json: { token, senha } })
}

// ---- chamados ----
export function listarChamados(): Promise<Chamado[]> {
  return req('/api/chamados')
}
export function criarChamado(dados: NovoChamado): Promise<Chamado> {
  return req('/api/chamados', { method: 'POST', json: dados })
}
export function atualizarStatus(id: number, status: Status): Promise<Chamado> {
  return req(`/api/chamados/${id}/status`, { method: 'PATCH', json: { status } })
}

// ---- admin: usuários ----
export function listarUsuarios(): Promise<UsuarioLista[]> {
  return req('/api/usuarios')
}
export function criarUsuario(dados: { nome: string; email: string; perfil_id: number }): Promise<{ id: number; convite_simulado: boolean }> {
  return req('/api/usuarios', { method: 'POST', json: dados })
}
export function atualizarUsuario(id: number, dados: Partial<{ nome: string; perfil_id: number; ativo: boolean }>): Promise<UsuarioLista> {
  return req(`/api/usuarios/${id}`, { method: 'PATCH', json: dados })
}
export function reenviarConvite(id: number): Promise<{ ok: true; convite_simulado: boolean }> {
  return req(`/api/usuarios/${id}/reenviar-convite`, { method: 'POST' })
}

// ---- admin: perfis ----
export function listarPerfis(): Promise<Perfil[]> {
  return req('/api/perfis')
}
export function criarPerfil(dados: Omit<Perfil, 'id' | 'total_usuarios'>): Promise<Perfil> {
  return req('/api/perfis', { method: 'POST', json: dados })
}
export function atualizarPerfil(id: number, dados: Partial<Omit<Perfil, 'id' | 'total_usuarios'>>): Promise<Perfil> {
  return req(`/api/perfis/${id}`, { method: 'PATCH', json: dados })
}
export function excluirPerfil(id: number): Promise<void> {
  return req(`/api/perfis/${id}`, { method: 'DELETE' })
}

// ---- admin: configurações ----
export function listarConfiguracoes(): Promise<Configuracao[]> {
  return req('/api/configuracoes')
}
export function salvarConfiguracao(chave: string, valor: string): Promise<{ ok: true }> {
  return req(`/api/configuracoes/${chave}`, { method: 'PATCH', json: { valor } })
}
export function testarEmail(para?: string): Promise<{ ok: true; simulado: boolean; para: string }> {
  return req('/api/configuracoes/testar-email', { method: 'POST', json: { para } })
}
