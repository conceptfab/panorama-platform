import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth/session';
import {
  getProjects,
  getProjectsForUser,
  getProjectsByGroupId,
  createProject,
} from '@/lib/db/projects';
import { getUserById } from '@/lib/db/users';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  groupIds: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const published = searchParams.get('published');

    // Admin can see all projects
    if (session.role === 'admin') {
      let projects = await getProjects();

      if (groupId) {
        projects = await getProjectsByGroupId(groupId);
      }

      if (published === 'true') {
        projects = projects.filter((p) => p.isPublished);
      }

      return NextResponse.json({ projects });
    }

    // Regular users only see published projects for their groups
    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const projects = await getProjectsForUser(user.groupIds);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const { name, description, groupIds } = createProjectSchema.parse(body);

    const project = await createProject(name, description, session.userId, groupIds);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
