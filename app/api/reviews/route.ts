import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Review from '@/lib/models/Review';

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    await connectDB();
    
    const query: any = {};
    if (projectId) query.projectId = projectId;
    
    const reviews = await Review.find(query).sort({ createdAt: -1 });
    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
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

    const review = await Review.create({
      ...body,
      createdBy: userId,
    });

    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
