import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ReviewAttachment from '@/lib/models/ReviewAttachment';

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const attachment = await ReviewAttachment.create(body);

    return NextResponse.json(attachment);
  } catch (error: any) {
    console.error('Error creating attachment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewItemId = searchParams.get('reviewItemId');

    await connectDB();
    
    const query: any = {};
    if (reviewItemId) query.reviewItemId = reviewItemId;
    
    const attachments = await ReviewAttachment.find(query).sort({ createdAt: -1 });
    return NextResponse.json(attachments);
  } catch (error: any) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
