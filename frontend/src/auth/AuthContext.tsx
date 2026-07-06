import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiEu, apiLogin, apiLogout } from '../api'
import type { Usuario } from '../types'

interface AuthValor {
  usuario: Usuario | null
  carregando: boolean
  /** Retorna mensagem de erro ou null em caso de sucesso. */
  entrar: (email: string, senha: string) => Promise<string | null>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthValor | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiEu().then((u) => {
      setUsuario(u)
      setCarregando(false)
    })
  }, [])

  async function entrar(email: string, senha: string): Promise<string | null> {
    try {
      const { usuario: u } = await apiLogin(email, senha)
      setUsuario(u)
      return null
    } catch (e) {
      return (e as Error).message
    }
  }

  async function sair(): Promise<void> {
    await apiLogout().catch(() => undefined)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
