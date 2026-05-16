import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Whatchu <noreply@whatchu.app>'
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const send = async (payload) => {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurada — email não enviado:', payload.subject)
    return null
  }
  return resend.emails.send(payload)
}

export const sendVerificationEmail = (to, token) => {
  const link = `${APP_URL}/verify-email?token=${token}`
  return send({
    from: FROM,
    to,
    subject: 'Confirme seu email — Whatchu',
    html: buildHtml({
      title: 'Confirme seu email',
      body: 'Clique no botão abaixo para verificar seu endereço de email e ativar sua conta.',
      ctaText: 'Verificar email',
      ctaLink: link,
      footer: 'Este link expira em 24 horas. Se você não criou uma conta, ignore este email.',
    }),
  })
}

export const sendPasswordResetEmail = (to, token) => {
  const link = `${APP_URL}/reset-password?token=${token}`
  return send({
    from: FROM,
    to,
    subject: 'Redefinição de senha — Whatchu',
    html: buildHtml({
      title: 'Redefinir senha',
      body: 'Recebemos uma solicitação para redefinir a senha da sua conta.',
      ctaText: 'Redefinir senha',
      ctaLink: link,
      footer: 'Este link expira em 30 minutos. Se você não solicitou a redefinição, ignore este email.',
    }),
  })
}

export const sendEmailChangeVerification = (to, token) => {
  const link = `${APP_URL}/verify-email?token=${token}&type=email-change`
  return send({
    from: FROM,
    to,
    subject: 'Confirme seu novo email — Whatchu',
    html: buildHtml({
      title: 'Confirme seu novo email',
      body: 'Clique no botão abaixo para confirmar a troca do seu endereço de email.',
      ctaText: 'Confirmar novo email',
      ctaLink: link,
      footer: 'Este link expira em 24 horas. Se você não solicitou esta troca, entre em contato conosco.',
    }),
  })
}

const buildHtml = ({ title, body, ctaText, ctaLink, footer }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #2a2a2a">
          <span style="font-size:24px;font-weight:700;color:#e50914">Whatchu</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff">${title}</h1>
          <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#aaaaaa">${body}</p>
          <a href="${ctaLink}" style="display:inline-block;padding:14px 28px;background:#e50914;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${ctaText}</a>
          <p style="margin:32px 0 0;font-size:13px;color:#666666">${footer}</p>
          <p style="margin:16px 0 0;font-size:12px;color:#444444">Ou acesse: <a href="${ctaLink}" style="color:#e50914;word-break:break-all">${ctaLink}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
