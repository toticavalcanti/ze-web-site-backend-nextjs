import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import MessageModel from '@/lib/models/Message';
import { messageSchema } from '@/lib/validations/message';
import { requireAdmin } from '@/lib/api';
import { auth } from '@/lib/auth';
import { isObjectId } from '@/lib/utils';
import { normalizeDocument, withPublishedFlag } from '@/lib/legacy';

function formatMessage(doc: Record<string, unknown> | null) {
  if (!doc) return null;
  const normalized = (normalizeDocument(doc) ?? {}) as Record<string, unknown>;
  const withDefaults = {
    ...normalized,
    response: typeof normalized.response === 'string' ? normalized.response : '',
    published: typeof normalized.published === 'boolean'
      ? normalized.published
      : normalized.status === 'published'
  } as Record<string, unknown>;
  return withPublishedFlag(withDefaults);
}

/**
 * Campos que NUNCA podem sair para o público (mesma lista de /api/messages).
 */
const PUBLIC_HIDDEN_FIELDS = ['email', 'created_by', 'createdBy', 'updated_by', 'updatedBy'];

function stripPrivateFields(doc: Record<string, unknown> | null) {
  if (!doc) return doc;
  const clone = { ...doc };
  for (const field of PUBLIC_HIDDEN_FIELDS) {
    delete clone[field];
  }
  return clone;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await connectMongo();
  const identifier = params.id;
  if (!isObjectId(identifier)) {
    return NextResponse.json(null, { status: 404 });
  }

  const message = await MessageModel.findById(identifier).lean();

  if (!message) {
    return NextResponse.json(null, { status: 404 });
  }

  const session = await auth();
  const isAdminRequest = Boolean(
    session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin')
  );

  const formatted = formatMessage(message as Record<string, unknown> | null);

  if (isAdminRequest) {
    return NextResponse.json(formatted);
  }

  // Mesmas regras de visibilidade da listagem: o público só enxerga mensagem
  // publicada e não-privada. 404 (em vez de 403) para não revelar que o
  // registro existe.
  const record = (formatted ?? {}) as Record<string, unknown>;
  if (record.published !== true || record.private === true) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(stripPrivateFields(formatted));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin();
  if ('response' in authResult) return authResult.response;

  if (!isObjectId(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = messageSchema.pick({ response: true }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    await connectMongo();
    const message = await MessageModel.findById(params.id);
    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    const previousResponse = typeof message.response === 'string' ? message.response : '';

    if ('response' in parsed.data) {
      message.response = parsed.data.response?.trim() ?? '';
    }

    const responseChanged = message.response !== previousResponse;

    await message.save();

    // Paridade com o hook afterUpdate do Strapi v3: resposta privada por e-mail.
    //
    // Duas diferenças conscientes em relação à versão anterior:
    //
    // 1. `await`. Em serverless (Vercel) a instância pode ser congelada assim
    //    que a resposta HTTP é enviada, então um envio "fire and forget" pode
    //    simplesmente nunca acontecer — e falha de forma intermitente, que é o
    //    pior tipo de falha. O try/catch garante que um erro de SMTP não
    //    derruba a requisição: a resposta já foi salva no banco de qualquer forma.
    //
    // 2. `responseChanged`. Sem isso, salvar duas vezes (corrigir um typo,
    //    por exemplo) manda dois e-mails para o mesmo fã.
    let emailSent: boolean | null = null;

    if (message.private && message.response && responseChanged) {
      try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
          to: message.email,
          subject: 'Site Zé Ramalho',
          text: message.response
        });
        emailSent = true;
        console.log(`✅ Email enviado para: ${message.email}`);
      } catch (emailError) {
        emailSent = false;
        console.error(`❌ Erro ao enviar email para ${message.email}:`, emailError);
      }
    }

    const updated = await MessageModel.findById(message._id).lean();
    const payload = formatMessage(updated as Record<string, unknown> | null);

    // `emailSent` só aparece quando houve tentativa de envio. Permite que o
    // painel avise a Roberta se o e-mail falhou, em vez de falhar em silêncio.
    return NextResponse.json(emailSent === null ? payload : { ...payload, emailSent });
  } catch (error) {
    console.error('Message update error', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin();
  if ('response' in authResult) return authResult.response;

  if (!isObjectId(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  await connectMongo();
  const message = await MessageModel.findById(params.id);
  if (!message) {
    return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
  }

  await message.deleteOne();

  return NextResponse.json({ message: 'Mensagem removida' });
}
