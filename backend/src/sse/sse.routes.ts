import { Router } from 'express'
import { subscribe } from './sse.broker.js'

const router = Router()

router.get('/events', (req, res) => {
  subscribe(res)
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25000)
  req.on('close', () => clearInterval(keepAlive))
})

export default router
