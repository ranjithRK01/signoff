import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { getUserIdFromRequest } from '@/lib/auth';

function getDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url;
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const projects = await Project.find({ ownerId: userId }).sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, url, version, description } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ error: 'Missing name or url' }, { status: 400 });
    }

    await connectDB();
    const domain = getDomain(url);

    const project = await Project.create({
      name,
      url,
      domain,
      ownerId: userId,
      currentVersion: version || '1.0.0',
      description,
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
