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

interface ErroHttp extends Error {
  status?: number
  type?: string
}

export function mapearErroHttp(erro: ErroHttp): { status: number; code: string; mensagem: string } {
  if (erro.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', mensagem: 'JSON inválido' }
  }
  if (erro.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', mensagem: 'payload excede o limite de 100kb' }
  }
  if (erro.type === 'encoding.unsupported' || erro.status === 415) {
    return { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', mensagem: 'codificação não suportada' }
  }
  return { status: 500, code: 'INTERNAL_ERROR', mensagem: 'erro interno' }
}

// headers de segurança; CSP desativada aqui pois a API não serve HTML
app.use(helmet({ contentSecurityPolicy: false }))
app.disable('x-powered-by')

app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ status: 'ok' })
})

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
app.use((err: ErroHttp, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return
  const resposta = mapearErroHttp(err)
  if (resposta.status === 500) console.error('[erro]', err)
  res.status(resposta.status).json({ error: resposta.mensagem, code: resposta.code })
})
