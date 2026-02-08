import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCloudinaryUsage } from '@/lib/cloudinary';

// Cache for 10 minutes
let cachedData: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

export async function GET() {
    const session = await auth();

    if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = Date.now();

        // Return cached data if still valid
        if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
            return NextResponse.json({
                ...cachedData.data,
                cached: true,
                cacheAge: Math.floor((now - cachedData.timestamp) / 1000) // seconds
            });
        }

        // Fetch fresh data
        const usage = await getCloudinaryUsage();

        // Update cache
        cachedData = {
            data: usage,
            timestamp: now
        };

        return NextResponse.json({
            ...usage,
            cached: false
        });
    } catch (error) {
        console.error('Error fetching Cloudinary usage:', error);

        // Return error state instead of fake zeros
        return NextResponse.json(
            {
                error: 'Failed to fetch Cloudinary usage',
                message: error instanceof Error ? error.message : 'Unknown error',
                available: false
            },
            { status: 500 }
        );
    }
}
