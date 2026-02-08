import nodemailer from 'nodemailer';

export interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
}

/**
 * Simple email service - Strapi v3 parity
 * Sends plain text emails using SMTP configuration from env vars
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
        auth: {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS_FROM,
        to: options.to,
        replyTo: process.env.EMAIL_ADDRESS_REPLY,
        subject: options.subject,
        text: options.text
    });
}
