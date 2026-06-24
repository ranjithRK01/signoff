import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Issue from '@/lib/models/Issue';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { projectId: string; issueId: string } }
) {
  try {
    console.log('API Route Hit! Params:', params);
    
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = params;
    await connectDB();
    console.log('Looking for issue with ID:', issueId);

    const issue = await Issue.findById(issueId);
    console.log('Found issue:', issue);
    
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error('Error fetching issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}