import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import MessageModel from '@/lib/models/Message';
import { messageSchema } from '@/lib/validations/message';
import { auth } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildPaginatedResponse, buildRegexFilter, normalizeDocument, parseLegacyPagination, withPublishedFlag } from '@/lib/legacy';

function formatMessage(doc: Record<string, unknown> | null) {
  if (!doc) return null;
  const normalized = (normalizeDocument(doc) ?? {}) as Record<string, unknown>;
  if (!normalized) return null;
  const withDefaults = {
    ...normalized,
    response: typeof normalized.response === 'string' ? normalized.response : '',
    published: typeof normalized.published === 'boolean'
      ? normalized.published
      : normalized.status === 'published',
    private: typeof normalized.private === 'boolean' ? normalized.private : false
  } as Record<string, unknown>;
  return withPublishedFlag(withDefaults);
}

/**
 * Campos que NUNCA podem sair para o público.
 * O `email` do fã é dado pessoal (LGPD) e o mural do site não precisa dele —
 * só o painel administrativo usa.
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

const SORT_FIELDS = new Map([
  ['createdAt', 'createdAt'],
  ['created_at', 'createdAt'],
  ['updatedAt', 'updatedAt'],
  ['updated_at', 'updatedAt'],
  ['name', 'name'],
  ['title', 'name'],
  ['content', 'message']
]);

function buildSort(sortParam?: string | null, directionParam?: string | null) {
  const resolvedParam = sortParam?.replace(/^-/, '') || 'createdAt';
  const sortField = SORT_FIELDS.get(resolvedParam) ?? 'createdAt';
  let direction = sortParam?.startsWith('-') || !sortParam ? -1 : 1;
  if (directionParam) {
    direction = directionParam === 'asc' ? 1 : -1;
  }
  return { [sortField]: direction } as Record<string, 1 | -1>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const [sortFieldParam, sortDirectionFromSortParam] = (searchParams.get('_sort') || searchParams.get('sort') || '').split(':');
  const explicitOrder = searchParams.get('_order') || searchParams.get('order');
  const sort = buildSort(sortFieldParam || undefined, sortDirectionFromSortParam || explicitOrder || null);
  const search = searchParams.get('search');
  const city = searchParams.get('city');
  const { start, limit, shouldPaginate, page } = parseLegacyPagination(searchParams);
  const session = await auth();
  const isAdminRequest = Boolean(session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin'));

  const filters: Record<string, unknown>[] = [];

  const statusParam = searchParams.get('status');
  if (statusParam === 'published') {
    filters.push({ published: true });
  } else if (statusParam === 'draft') {
    filters.push({ published: false });
  }

  const publishedParam = searchParams.get('published');
  if (publishedParam != null) {
    filters.push({ published: publishedParam === 'true' || publishedParam === '1' });
  }

  if (search) {
    const regex = buildRegexFilter(search);
    filters.push({
      $or: [
        { name: regex },
        { email: regex },
        { city: regex },
        { state: regex },
        { message: regex },
        { response: regex }
      ]
    });
  }

  if (city) {
    filters.push({ city: { $regex: city, $options: 'i' } });
  }

  if (!isAdminRequest) {
    filters.push({ published: true });
    filters.push({ private: { $ne: true } });
  }

  const filter: Record<string, unknown> = filters.length ? { $and: filters } : {};

  await connectMongo();
  const query = MessageModel.find(filter).sort(sort).lean();

  if (typeof start === 'number' && start > 0) {
    query.skip(start);
  }

  if (typeof limit === 'number' && limit >= 0 && limit > 0) {
    query.limit(limit);
  }

  const [messages, total] = await Promise.all([
    query,
    shouldPaginate ? MessageModel.countDocuments(filter) : Promise.resolve(undefined)
  ]);
  const formatted = messages.map((message) => {
    const doc = formatMessage(message);
    return isAdminRequest ? doc : stripPrivateFields(doc);
  });

  if (shouldPaginate) {
    return NextResponse.json(buildPaginatedResponse(formatted, { total, limit: limit ?? undefined, start, page }));
  }

  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot anti-spam: o form do site inclui um campo "website" invisível
    // para humanos. Bots que o preenchem recebem um 201 falso e nada é salvo.
    if (typeof body?.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const session = await auth();
    const isAdminRequest = Boolean(session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin'));

    // Rate limit por IP para o público (admins ficam isentos): 3 mensagens/hora.
    if (!isAdminRequest) {
      const ip = getClientIp(request);
      const rate = await checkRateLimit(`messages:${ip}`, 3, 60 * 60 * 1000);
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Muitas mensagens enviadas. Tente novamente mais tarde.' },
          { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
        );
      }
    }

    await connectMongo();
    // Force published=false (moderation workflow - same as Strapi v3)
    const payload = {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim(),
      city: parsed.data.city?.trim() ?? '',
      state: parsed.data.state?.trim() ?? '',
      message: parsed.data.message?.trim() ?? '',
      response: parsed.data.response?.trim() ?? '',
      published: false,
      private: parsed.data.private ?? false
    } as Record<string, unknown>;

    if (session?.user?.id) {
      payload.created_by = session.user.id;
    }

    const message = await MessageModel.create(payload);

    const created = await MessageModel.findById(message._id).lean();
    return NextResponse.json(formatMessage(created as Record<string, unknown> | null), { status: 201 });
  } catch (error) {
    console.error('Message create error', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
