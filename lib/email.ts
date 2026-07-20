import nodemailer from 'nodemailer';

export interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
}

/**
 * Serviço de e-mail — paridade com o Strapi v3 (resposta privada ao fã).
 *
 * Env vars unificadas com o restante do projeto (env.mjs / forgot-password):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  → conexão
 *   EMAIL_FROM      → remetente (fallback: EMAIL_ADDRESS_FROM legado, depois SMTP_USER)
 *   EMAIL_REPLY_TO  → reply-to  (fallback: EMAIL_ADDRESS_REPLY legado, depois EMAIL_FROM)
 *
 * As variáveis legadas EMAIL_SMTP_* continuam aceitas como fallback para não
 * quebrar ambientes já configurados no padrão antigo.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
    const host = process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error(
            'Configuração SMTP ausente: defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no ambiente.'
        );
    }

    const from = process.env.EMAIL_FROM || process.env.EMAIL_ADDRESS_FROM || user;
    const replyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_ADDRESS_REPLY || from;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });

    await transporter.sendMail({
        from,
        to: options.to,
        replyTo,
        subject: options.subject,
        text: options.text
    });
}
