import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, logout, solicitarReset, redefinirSenha } from './auth.service.js'
import { COOKIE_SESSAO, exigirAuth } from './middleware.js'
import { asyncHandler } from '../http/async.js'
import { enviarEmail } from '../email/email.service.js'
import { emailReset } from '../email/templates.js'
import { obterConfig, obterConfigNumero } from '../configuracoes/configuracoes.service.js'

const router = Router()

// anti força-bruta — respostas 429 genéricas
const limiteLogin = rateLimit({
  windowMs: 15 * 60_000, limit: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'muitas tentativas — aguarde alguns minutos' },
})
const limiteReset = rateLimit({
  windowMs: 15 * 60_000, limit: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'muitas tentativas — aguarde alguns minutos' },
})

const cookieSeguro = process.env.COOKIE_SECURE === 'true'

router.post('/auth/login', limiteLogin, asyncHandler(async (req, res) => {
  const { email, senha } = req.body ?? {}
  if (typeof email !== 'string' || typeof senha !== 'string' || !email || !senha) {
    res.status(400).json({ error: 'informe e-mail e senha' })
    return
  }

  const r = await login(email.trim().toLowerCase(), senha, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  })
  if (!r.ok) {
    res.status(401).json({ error: r.erro })
    return
  }

  res.cookie(COOKIE_SESSAO, r.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSeguro,
    expires: r.expiraEm,
    path: '/',
  })
  res.json({ usuario: r.usuario })
}))

router.post('/auth/logout', asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_SESSAO]
  if (typeof token === 'string') await logout(token)
  res.clearCookie(COOKIE_SESSAO, { path: '/' })
  res.status(204).end()
}))

router.get('/auth/eu', exigirAuth, (req, res) => {
  res.json({ usuario: req.usuario })
})

router.post('/auth/esqueci-senha', limiteReset, asyncHandler(async (req, res) => {
  const { email } = req.body ?? {}
  if (typeof email === 'string' && email) {
    const r = await solicitarReset(email.trim().toLowerCase())
    if (r) {
      const appUrl = await obterConfig('app_url', 'http://localhost:5173')
      const validadeMin = await obterConfigNumero('reset_validade_min', 30)
      const link = `${appUrl}/redefinir-senha?token=${r.token}`
      const tpl = emailReset({ nome: r.usuario.nome, link, validadeMin })
      // falha de SMTP não pode revelar nada ao cliente
      await enviarEmail({ para: r.usuario.email, ...tpl }).catch((e) => {
        console.error('[esqueci-senha] falha ao enviar e-mail:', (e as Error).message)
      })
    }
  }
  // resposta idêntica exista o e-mail ou não (anti-enumeração)
  res.json({ ok: true, mensagem: 'se o e-mail estiver cadastrado, você receberá as instruções' })
}))

router.post('/auth/redefinir-senha', limiteReset, asyncHandler(async (req, res) => {
  const { token, senha } = req.body ?? {}
  if (typeof token !== 'string' || typeof senha !== 'string') {
    res.status(400).json({ error: 'dados inválidos' })
    return
  }
  const r = await redefinirSenha(token, senha)
  if (!r.ok) {
    res.status(400).json({ error: r.erro })
    return
  }
  res.json({ ok: true })
}))

export default router
