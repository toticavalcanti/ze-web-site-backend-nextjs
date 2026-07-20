import { models, model, Schema } from 'mongoose';
import { connectMongo } from '@/lib/mongodb';

/**
 * Rate limit simples baseado no MongoDB (janela fixa).
 * Sem dependências externas e compatível com serverless (Vercel), já que o
 * estado vive no banco e não na memória do processo.
 *
 * A collection `ratelimits` tem índice TTL: documentos expiram sozinhos
 * depois da janela, então não acumulam lixo.
 */

const RateLimitSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        count: { type: Number, default: 0 },
        windowStart: { type: Date, required: true },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: false }
);

// TTL: o Mongo remove o documento quando expiresAt passa.
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitModel = models.RateLimit || model('RateLimit', RateLimitSchema);

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

/**
 * @param key      identificador (ex.: `messages:189.10.20.30`)
 * @param limit    máximo de ações dentro da janela
 * @param windowMs tamanho da janela em ms
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    await connectMongo();
    const now = new Date();

    const doc = await RateLimitModel.findOne({ key });

    if (!doc || doc.expiresAt <= now) {
        await RateLimitModel.findOneAndUpdate(
            { key },
            { key, count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs) },
            { upsert: true }
        );
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (doc.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    doc.count += 1;
    await doc.save();
    return { allowed: true, remaining: limit - doc.count, retryAfterSeconds: 0 };
}

/** Extrai o IP do cliente atrás do proxy da Vercel. */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}
