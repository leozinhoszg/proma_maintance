/**
 * Templates HTML dos e-mails — identidade PROMA industrial.
 * Fundo claro e estilos inline para compatibilidade com clientes de e-mail.
 */

const AMBAR = '#b87f00'
const GRAFITE = '#0e141b'

function layoutBase(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f2f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #dde3e9;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${GRAFITE};padding:20px 28px;">
            <span style="font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:2px;">PROMA</span>
            <span style="font-size:18px;font-weight:bold;color:#ffb300;letter-spacing:2px;text-transform:uppercase;">&nbsp;MAINTANCE</span>
          </td>
        </tr>
        <tr><td style="height:5px;background:repeating-linear-gradient(-45deg,#ffb300 0 10px,${GRAFITE} 10px 20px);font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:${GRAFITE};">${titulo}</h1>
            ${corpo}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #e8ecf0;">
            <p style="margin:0;font-size:12px;color:#8a98a8;">
              Sistema de Chamados de Manutenção · PROMA Group<br/>
              E-mail automático — não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function botao(texto: string, link: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#ffb300;border-radius:4px;">
      <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:${GRAFITE};text-decoration:none;letter-spacing:1px;text-transform:uppercase;">${texto}</a>
    </td></tr>
  </table>`
}

function avisoLink(link: string): string {
  return `<p style="font-size:13px;color:#5a6878;line-height:1.6;">
    Se o botão não funcionar, copie e cole este endereço no navegador:<br/>
    <a href="${link}" style="color:${AMBAR};word-break:break-all;">${link}</a>
  </p>`
}

export function emailConvite(dados: { nome: string; link: string; validadeHoras: number }) {
  const corpo = `
    <p style="font-size:15px;color:#333;line-height:1.7;">Olá, <b>${dados.nome}</b>.</p>
    <p style="font-size:15px;color:#333;line-height:1.7;">
      Uma conta foi criada para você no <b>Sistema de Chamados de Manutenção</b> da PROMA.
      Para começar a usar, defina sua senha de acesso:
    </p>
    ${botao('Definir minha senha', dados.link)}
    <p style="font-size:13px;color:#5a6878;line-height:1.6;">
      Este link vale por <b>${dados.validadeHoras} horas</b> e só pode ser usado uma vez.
    </p>
    ${avisoLink(dados.link)}`
  return { assunto: 'Bem-vindo ao Sistema de Manutenção PROMA — defina sua senha', html: layoutBase('Sua conta foi criada', corpo) }
}

export function emailReset(dados: { nome: string; link: string; validadeMin: number }) {
  const corpo = `
    <p style="font-size:15px;color:#333;line-height:1.7;">Olá, <b>${dados.nome}</b>.</p>
    <p style="font-size:15px;color:#333;line-height:1.7;">
      Recebemos um pedido para redefinir a senha da sua conta. Se foi você, use o botão abaixo:
    </p>
    ${botao('Redefinir senha', dados.link)}
    <p style="font-size:13px;color:#5a6878;line-height:1.6;">
      Este link vale por <b>${dados.validadeMin} minutos</b> e só pode ser usado uma vez.<br/>
      Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma.
    </p>
    ${avisoLink(dados.link)}`
  return { assunto: 'Redefinição de senha — Sistema de Manutenção PROMA', html: layoutBase('Redefinir senha', corpo) }
}

export function emailTeste() {
  const corpo = `
    <p style="font-size:15px;color:#333;line-height:1.7;">
      Este é um <b>e-mail de teste</b> enviado pela tela de configurações do sistema.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.7;">
      Se você o recebeu, o SMTP está configurado corretamente. ✓
    </p>`
  return { assunto: 'Teste de SMTP — Sistema de Manutenção PROMA', html: layoutBase('SMTP funcionando', corpo) }
}
