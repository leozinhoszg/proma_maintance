import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { EVENTO_NAO_AUTORIZADO, apiEu, apiLogin, apiLogout } from '../api'
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
  const versaoAuth = useRef(0)

  useEffect(() => {
    const versao = versaoAuth.current
    apiEu()
      .then((u) => {
        if (versaoAuth.current === versao) setUsuario(u)
      })
      .catch(() => undefined)
      .finally(() => setCarregando(false))

    const invalidar = () => {
      versaoAuth.current += 1
      setUsuario(null)
      setCarregando(false)
    }
    window.addEventListener(EVENTO_NAO_AUTORIZADO, invalidar)
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, invalidar)
  }, [])

  async function entrar(email: string, senha: string): Promise<string | null> {
    try {
      const { usuario: u } = await apiLogin(email, senha)
      versaoAuth.current += 1
      setUsuario(u)
      return null
    } catch (e) {
      return (e as Error).message
    }
  }

  async function sair(): Promise<void> {
    versaoAuth.current += 1
    setUsuario(null)
    await apiLogout().catch(() => undefined)
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
