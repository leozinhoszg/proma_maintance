import express from 'express'
import cors from 'cors'
import chamadosRoutes from './chamados/chamados.routes.js'
import sseRoutes from './sse/sse.routes.js'

export const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', chamadosRoutes)
app.use('/api', sseRoutes)
