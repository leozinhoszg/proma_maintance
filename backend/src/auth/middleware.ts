import type { NextFunction, Request, Response } from 'express'
import { validarSessao, type UsuarioAutenticado, type PerfilPermissoes } from './auth.service.js'

export const COOKIE_SESSAO = 'proma_sessao'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado
    }
  }
}

export async function exigirAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_SESSAO]
    if (typeof token !== 'string' || token.length !== 64) {
      res.status(401).json({ error: 'não autenticado' })
      return
    }
    const usuario = await validarSessao(token)
    if (!usuario) {
      res.status(401).json({ error: 'não autenticado' })
      return
    }
    req.usuario = usuario
    next()
  } catch (e) {
    next(e)
  }
}

type Permissao = keyof Omit<PerfilPermissoes, 'id' | 'nome'>

/** Usar sempre depois de exigirAuth. */
export function exigirPermissao(permissao: Permissao) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: 'não autenticado' })
      return
    }
    if (!req.usuario.perfil[permissao]) {
      res.status(403).json({ error: 'sem permissão para esta ação' })
      return
    }
    next()
  }
}
