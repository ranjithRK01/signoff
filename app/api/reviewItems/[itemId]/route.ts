import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ReviewItem from '@/lib/models/ReviewItem';

export async function GET(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = params;
    await connectDB();

    const item = await ReviewItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error fetching review item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = params;
    const body = await req.json();

    await connectDB();

    const item = await ReviewItem.findByIdAndUpdate(
      itemId,
      { $set: body },
      { new: true }
    );

    if (!item) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error updating review item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
