import { Router } from 'express'
import { closeSession, keepAlive, subscribe } from './sse.broker.js'
import { exigirAuth } from '../auth/middleware.js'
import { validarSessaoPorId } from '../auth/auth.service.js'

const router = Router()

// SSE também exige sessão — o EventSource envia o cookie automaticamente
router.get('/events', exigirAuth, (req, res) => {
  const sessionId = req.sessao!.id
  const aceito = subscribe(res, { sessionId, userId: req.usuario!.id })
  if (!aceito) {
    res.setHeader('Retry-After', '5')
    res.status(429).json({ error: 'limite de conexões em tempo real atingido' })
    return
  }

  const timer = setInterval(async () => {
    try {
      if (!(await validarSessaoPorId(sessionId))) {
        closeSession(sessionId)
        return
      }
      keepAlive(res)
    } catch {
      closeSession(sessionId)
    }
  }, 25000)
  req.on('close', () => clearInterval(timer))
})

export default router
