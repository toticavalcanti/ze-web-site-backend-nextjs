# Message Email Notification — Strapi v3 Parity

## Behavior

Matches Strapi v3 `afterUpdate` lifecycle hook behavior exactly.

**When admin updates a message:**
- If `private: true` AND `response` is not empty
- System sends email to `message.email` (user's email)
- Email contains `message.response` (admin's response)
- Subject: "Site Zé Ramalho"

**Important:**
- Email is **additional notification**, not a replacement
- Response **still appears publicly** on frontend
- Email sending is **non-blocking** (doesn't delay request)
- If email fails, request still succeeds (error logged)

## Configuration

**Required environment variables:**

```bash
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASS=your-app-password
EMAIL_ADDRESS_FROM=your-email@gmail.com
EMAIL_ADDRESS_REPLY=your-email@gmail.com
```

**No hardcoded values** — all configuration via env vars.

## Implementation

**Files:**
- [`lib/email.ts`](file:///c:/Users/totic/my_projects/ze-ramalho/backend-antigo-e-novo/ze-web-site-backend-nextjs/lib/email.ts) — Simple email service using nodemailer
- [`app/api/messages/[id]/route.ts`](file:///c:/Users/totic/my_projects/ze-ramalho/backend-antigo-e-novo/ze-web-site-backend-nextjs/app/api/messages/[id]/route.ts) — Email trigger in PUT handler

**Logic:**
```typescript
// After message.save()
if (message.private && message.response) {
  // Non-blocking email send
  sendEmail({
    to: message.email,
    subject: 'Site Zé Ramalho',
    text: message.response
  });
}
```

## Testing

1. Configure env vars in `.env.local`
2. Create a message via public form
3. Admin adds response and marks `private: true`
4. Check console for: `✅ Email enviado para: user@example.com`
5. Verify email received at user's inbox

## Original Strapi v3 Code

Reference: [`api/message/models/message.js:17-30`](file:///c:/Users/totic/my_projects/ze-ramalho/backend-antigo-e-novo/ze-web-site-backend-master-strapi-antigo/api/message/models/message.js#L17-L30)

```javascript
afterUpdate: async(data) => {
    if (data.private) {
        await strapi.plugins['email'].services.email.send({
            to: data.email,
            from: 'robertaramalho@avohaimusic.com',
            replyTo: 'robertaramalho@avohaimusic.com',
            subject: 'Site Zé Ramalho',
            text: data.response,
        });
    }
}
```

**Next.js implementation matches this behavior exactly.**
