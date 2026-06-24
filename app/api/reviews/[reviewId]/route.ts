import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Review from '@/lib/models/Review';

export async function GET(
  req: Request,
  { params }: { params: { reviewId: string } }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId } = params;
    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { reviewId: string } }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId } = params;
    const body = await req.json();

    await connectDB();

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $set: body },
      { new: true }
    );

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
