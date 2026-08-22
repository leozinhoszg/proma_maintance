import 'dotenv/config'
import { app } from './app.js'
import knex from './db/knex.js'
import { encerrarConexoes } from './sse/sse.broker.js'

const port = Number(process.env.PORT ?? 3001)
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Backend em http://localhost:${port} (acessível na rede)`)
})

let encerrando = false

async function encerrar(signal: NodeJS.Signals): Promise<void> {
  if (encerrando) return
  encerrando = true
  console.log(`[shutdown] ${signal}: encerrando servidor`)

  const timeout = setTimeout(() => {
    console.error('[shutdown] tempo limite excedido')
    server.closeAllConnections()
    process.exit(1)
  }, 10_000)
  timeout.unref()

  let falhou = false
  try {
    await new Promise<void>((resolve, reject) => {
      server.close(erro => erro ? reject(erro) : resolve())
      encerrarConexoes()
    })
  } catch (erro) {
    falhou = true
    console.error('[shutdown] falha ao fechar servidor', erro)
    server.closeAllConnections()
  }

  try {
    await knex.destroy()
  } catch (erro) {
    falhou = true
    console.error('[shutdown] falha ao fechar pool', erro)
  }

  clearTimeout(timeout)
  process.exitCode = falhou ? 1 : 0
  console.log('[shutdown] encerrado')
}

process.on('SIGTERM', () => void encerrar('SIGTERM'))
process.on('SIGINT', () => void encerrar('SIGINT'))
