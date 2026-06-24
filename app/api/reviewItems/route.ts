import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ReviewItem from '@/lib/models/ReviewItem';

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('reviewId');

    await connectDB();
    
    const query: any = {};
    if (reviewId) query.reviewId = reviewId;
    
    const items = await ReviewItem.find(query).sort({ itemNumber: 1 });
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching review items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const item = await ReviewItem.create({
      ...body,
      createdBy: userId,
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error creating review item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
