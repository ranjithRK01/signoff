import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Version from '@/lib/models/Version';

export async function GET(
  req: Request,
  { params }: { params: { versionId: string } }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionId } = params;
    await connectDB();

    const version = await Version.findById(versionId);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error: any) {
    console.error('Error fetching version:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
