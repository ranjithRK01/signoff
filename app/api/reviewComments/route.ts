import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ReviewComment from '@/lib/models/ReviewComment';

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const comment = await ReviewComment.create({
      ...body,
      authorId: userId,
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Error creating comment:', error);
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
    const reviewId = searchParams.get('reviewId');

    await connectDB();
    
    const query: any = {};
    if (reviewItemId) query.reviewItemId = reviewItemId;
    if (reviewId) query.reviewId = reviewId;
    
    const comments = await ReviewComment.find(query).sort({ createdAt: 1 });
    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
