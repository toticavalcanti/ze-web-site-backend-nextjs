import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';

export async function GET() {
    const session = await auth();

    if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        // Count unpublished messages as unread notifications
        const unreadCount = await Message.countDocuments({ published: false });

        return NextResponse.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
