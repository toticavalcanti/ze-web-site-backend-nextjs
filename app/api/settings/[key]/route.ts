import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectMongo } from '@/lib/mongodb';
import SiteSettingModel, { isSiteSettingKey } from '@/lib/models/SiteSetting';
import { requireAdmin } from '@/lib/api';

export const dynamic = 'force-dynamic';

const backgroundSchema = z.object({
  url: z.string().url().max(2000),
  mediaId: z.string().optional()
});

const biographyBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().max(300) }),
  z.object({ type: z.literal('paragraph'), text: z.string().max(10000) }),
  z.object({
    type: z.literal('image'),
    title: z.string().max(300).default(''),
    url: z.string().url().max(2000),
    alt: z.string().max(300).default(''),
    caption: z.string().max(300).default(''),
    width: z.number().int().positive().max(4000).default(800),
    height: z.number().int().positive().max(4000).default(800)
  })
]);

const biographySchema = z.object({
  writtenBy: z.string().max(200).default(''),
  blocks: z.array(biographyBlockSchema).max(500)
});

const VALUE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  home_background: backgroundSchema,
  messages_post_background: backgroundSchema,
  biography_pt: biographySchema,
  biography_en: biographySchema
};

export async function GET(_: Request, { params }: { params: { key: string } }) {
  if (!isSiteSettingKey(params.key)) {
    return NextResponse.json({ error: 'Configuração desconhecida' }, { status: 404 });
  }

  await connectMongo();
  const setting = await SiteSettingModel.findOne({ key: params.key }).lean();

  if (!setting) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json((setting as unknown as { value: unknown }).value);
}

export async function PUT(request: Request, { params }: { params: { key: string } }) {
  const authResult = await requireAdmin();
  if ('response' in authResult) return authResult.response;

  if (!isSiteSettingKey(params.key)) {
    return NextResponse.json({ error: 'Configuração desconhecida' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const schema = VALUE_SCHEMAS[params.key];
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    await connectMongo();
    const setting = await SiteSettingModel.findOneAndUpdate(
      { key: params.key },
      { key: params.key, value: parsed.data, updated_by: authResult.session.user!.id },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json((setting as unknown as { value: unknown }).value);
  } catch (error) {
    console.error('Site setting update error', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
