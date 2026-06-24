import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Version from '@/lib/models/Version';

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
    
    const versions = await Version.find(query).sort({ versionNumber: 1 });
    return NextResponse.json(versions);
  } catch (error: any) {
    console.error('Error fetching versions:', error);
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

    const version = await Version.create({
      ...body,
      submittedBy: userId,
    });

    return NextResponse.json(version);
  } catch (error: any) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
