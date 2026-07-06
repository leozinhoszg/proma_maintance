import type {
  Chamado, NovoChamado, Status, Usuario, UsuarioLista, Perfil, Configuracao,
} from './types'

async function req<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...resto } = init ?? {}
  const res = await fetch(url, {
    ...resto,
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`)
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
  } catch {
    return null
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
