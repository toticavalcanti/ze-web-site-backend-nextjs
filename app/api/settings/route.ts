import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import SiteSettingModel from '@/lib/models/SiteSetting';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings — público.
 * Retorna todas as configurações do site como um mapa { key: value }.
 * O frontend consome este endpoint (com revalidate) para a imagem de fundo
 * da home, o fundo de /messages/post e as biografias.
 */
export async function GET() {
  await connectMongo();
  const settings = await SiteSettingModel.find().lean();

  const map: Record<string, unknown> = {};
  for (const setting of settings) {
    const { key, value } = setting as unknown as { key: string; value: unknown };
    map[key] = value;
  }

  return NextResponse.json(map);
}
