import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import PhotoModel from '@/lib/models/Photo';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/photos/count — paridade com o Strapi v3 (/photos/count).
 * Público: conta apenas registros publicados.
 * Admin autenticado: pode usar ?published=all | true | false.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const session = await auth();
    const isAdminRequest = Boolean(
        session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin')
    );

    const publishedParam = searchParams.get('published')?.toLowerCase();
    const filter: Record<string, unknown> = {};

    if (isAdminRequest && publishedParam === 'all') {
        // sem filtro de publicação
    } else if (isAdminRequest && (publishedParam === 'false' || publishedParam === 'draft')) {
        filter.published_at = null;
    } else {
        filter.published_at = { $ne: null };
    }

    await connectMongo();
    const count = await PhotoModel.countDocuments(filter);

    return NextResponse.json(count);
}
