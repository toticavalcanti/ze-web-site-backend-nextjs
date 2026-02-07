import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongodb';
import MessageModel from '@/lib/models/Message';
import { auth } from '@/lib/auth';

export async function GET() {
    const session = await auth();
    const isAdminRequest = Boolean(session?.user && (session.user.role === 'admin' || session.user.role === 'super_admin'));

    const filters: Record<string, unknown>[] = [];

    // Public: only published and non-private messages
    if (!isAdminRequest) {
        filters.push({ published: true });
        filters.push({ private: { $ne: true } });
    }

    const filter: Record<string, unknown> = filters.length ? { $and: filters } : {};

    await connectMongo();
    const count = await MessageModel.countDocuments(filter);

    return NextResponse.json(count);
}
