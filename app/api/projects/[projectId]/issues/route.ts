import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Issue from '@/lib/models/Issue';
import Project from '@/lib/models/Project';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const body = await req.json();

    await connectDB();

    // Verify project exists and user has access (optional but recommended)
    const project = await Project.findOne({ _id: projectId, ownerId: userId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const issue = await Issue.create({
      projectId,
      userId,
      ...body,
    });

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error('Error creating issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    await connectDB();

    // Only select fields we need for the list view to reduce memory usage
    const issues = await Issue.find({ projectId })
      .select('_id title description severity status assignee screenshot createdAt pageUrl pageTitle elementRect elementSelector elementBoundingBox pathname');
    
    // Sort in Node.js instead of MongoDB to avoid memory limit errors
    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(issues);
  } catch (error: any) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
