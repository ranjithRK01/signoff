import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Approval from '@/lib/models/Approval';

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const approval = await Approval.create({
      ...body,
      approvedBy: userId,
    });

    return NextResponse.json(approval);
  } catch (error: any) {
    console.error('Error creating approval:', error);
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
    const reviewId = searchParams.get('reviewId');

    await connectDB();
    
    const query: any = {};
    if (reviewId) query.reviewId = reviewId;
    
    const approvals = await Approval.find(query).sort({ approvedAt: -1 });
    return NextResponse.json(approvals);
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
