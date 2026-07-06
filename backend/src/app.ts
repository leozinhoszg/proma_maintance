import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import authRoutes from './auth/auth.routes.js'
import chamadosRoutes from './chamados/chamados.routes.js'
import sseRoutes from './sse/sse.routes.js'
import usuariosRoutes from './usuarios/usuarios.routes.js'
import perfisRoutes from './usuarios/perfis.routes.js'
import configuracoesRoutes from './configuracoes/configuracoes.routes.js'

export const app = express()

// headers de segurança; CSP desativada aqui pois a API não serve HTML
app.use(helmet({ contentSecurityPolicy: false }))
app.disable('x-powered-by')

// sem middleware de CORS: requisições cross-origin são negadas por padrão —
// o frontend fala com a API pelo proxy same-origin do Vite
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.use('/api', authRoutes)
app.use('/api', chamadosRoutes)
app.use('/api', sseRoutes)
app.use('/api', usuariosRoutes)
app.use('/api', perfisRoutes)
app.use('/api', configuracoesRoutes)

// handler global: detalhe só no log do servidor, resposta genérica ao cliente
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[erro]', err)
  if (res.headersSent) return
  res.status(500).json({ error: 'erro interno' })
})
