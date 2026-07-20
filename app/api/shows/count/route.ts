import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import ShowModel from '@/lib/models/Show';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/shows/count — paridade com o Strapi v3 (/shows/count).
 * Público: conta apenas shows publicados e não "realizado" (soft delete),
 * espelhando o filtro padrão do GET /api/shows.
 * Admin autenticado: ?published=all e ?showStatus=all|realizado|cancelado.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const session = await auth();
    const isAdminRequest = Boolean(
        session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin')
    );

    const publishedParam = searchParams.get('published')?.toLowerCase();
    const showStatusParam = searchParams.get('showStatus');

    const andFilters: Record<string, unknown>[] = [];

    if (isAdminRequest && publishedParam === 'all') {
        // sem filtro de publicação
    } else if (isAdminRequest && (publishedParam === 'false' || publishedParam === 'draft')) {
        andFilters.push({ published_at: null });
    } else {
        andFilters.push({ published_at: { $ne: null } });
    }

    if (isAdminRequest && showStatusParam === 'all') {
        // sem filtro de status
    } else if (isAdminRequest && (showStatusParam === 'realizado' || showStatusParam === 'cancelado')) {
        andFilters.push({ showStatus: showStatusParam });
    } else {
        andFilters.push({ $or: [{ showStatus: { $ne: 'realizado' } }, { showStatus: { $exists: false } }] });
    }

    await connectMongo();
    const count = await ShowModel.countDocuments(andFilters.length ? { $and: andFilters } : {});

    return NextResponse.json(count);
}
