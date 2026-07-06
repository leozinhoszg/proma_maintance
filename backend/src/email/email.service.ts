import nodemailer from 'nodemailer'
import { obterConfig, obterConfigNumero } from '../configuracoes/configuracoes.service.js'

interface Envio { para: string; assunto: string; html: string }

/**
 * Envia e-mail usando as configurações SMTP do banco (dinâmicas, sem restart).
 * Sem smtp_host configurado, simula o envio no console — útil em desenvolvimento.
 */
export async function enviarEmail({ para, assunto, html }: Envio): Promise<{ simulado: boolean }> {
  const host = await obterConfig('smtp_host')

  if (!host) {
    console.log(`[e-mail simulado] para: ${para} | assunto: ${assunto}`)
    return { simulado: true }
  }

  const porta = await obterConfigNumero('smtp_porta', 587)
  const usuario = await obterConfig('smtp_usuario')
  const senha = await obterConfig('smtp_senha')
  const remetente = await obterConfig('smtp_remetente', 'Manutenção PROMA <no-reply@proma.local>')

  const transporter = nodemailer.createTransport({
    host,
    port: porta,
    secure: porta === 465,
    auth: usuario ? { user: usuario, pass: senha } : undefined,
  })

  await transporter.sendMail({ from: remetente, to: para, subject: assunto, html })
  return { simulado: false }
}
