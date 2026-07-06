import { Router } from 'express'
import { subscribe } from './sse.broker.js'
import { exigirAuth } from '../auth/middleware.js'

const router = Router()

// SSE também exige sessão — o EventSource envia o cookie automaticamente
router.get('/events', exigirAuth, (req, res) => {
  subscribe(res)
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25000)
  req.on('close', () => clearInterval(keepAlive))
})

export default router
