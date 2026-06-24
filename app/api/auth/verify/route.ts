import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await clerkClient.users.getUser(userId);
    return NextResponse.json({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName || user.username,
      avatar: user.imageUrl,
    });
  } catch (error: any) {
    console.error('Error verifying auth:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
